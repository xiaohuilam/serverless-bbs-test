import { Hono } from 'hono';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import type { Bindings, Passkey, User } from '../types';
import { getPasskeyById } from '../lib/passkeys';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createMiddleware } from 'hono/factory';
import { AuthVariables } from '../auth/middleware';

// Admin Auth Middleware
export const adminAuthMiddleware = createMiddleware<{ Bindings: Bindings, Variables: AuthVariables }>(async (c, next) => {
  // 在真实应用中，这里应验证 JWT 或 session token
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'Unauthorized: no Authorization header' }, 401);
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return c.json({ error: 'Unauthorized: no token' }, 401);
  }
  const userId = await c.env.KV_SESSIONS.get(`session:${token}`);
  if (!userId) {
    console.log(token);
    return c.json({ error: 'Unauthorized: no id' }, 401);
  }
  const user = <User> await c.env.DB.prepare('SELECT * FROM Users WHERE id = ?').bind(userId).first();
  if (!user) {
    return c.json({ error: 'Unauthorized: no user[SELECT * FROM Users WHERE id = "' +userId + '"]' }, 401);
  }
  if (user.role != 'admin') {
    return c.json({ error: 'Access denied: no role' }, 403);
  }

  c.set('user', user);
  await next();
});

const app = new Hono<{ Bindings: Bindings }>();

// 1. Admin Login - Generate Challenge
app.post('/login/challenge', async (c) => {
  const options = await generateAuthenticationOptions({
    rpID: c.env.RP_ID,
    userVerification: 'preferred',
  });
  console.log(`challenge:${options.challenge}`);
  await c.env.KV_SESSIONS.put(`challenge:${options.challenge}`, "true", { expirationTtl: 300 });
  return c.json(options);
});

// 2. Admin Login - Verify Response
app.post('/login/verify', async (c) => {
  const response = await c.req.json<AuthenticationResponseJSON>();
  const { ORIGIN, RP_ID } = c.env;

  if (!response) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // Extract challenge from clientDataJSON
  const clientDataJSON = response.response.clientDataJSON;
  const clientData = JSON.parse(
    new TextDecoder().decode(
      typeof clientDataJSON === 'string'
        ? Uint8Array.from(atob(clientDataJSON.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
        : new Uint8Array(clientDataJSON)
    )
  );
  const challenge = clientData.challenge;

  const expectedChallenge = await c.env.KV_SESSIONS.get(`challenge:${challenge}`);
  if (!expectedChallenge) {
    return c.json({ error: 'Challenge expired or not found' }, 400);
  }

  const passkey = await getPasskeyById(c.env.DB, response.id);
  if (!passkey) {
    return c.json({ error: 'Credential not registered' }, 400);
  }

  // Verify the Passkey response
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: passkey.id,
        credentialPublicKey: new Uint8Array(passkey.pubkey_blob),
        counter: passkey.sign_counter,
      },
      requireUserVerification: false,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }

  const { verified, authenticationInfo } = verification;
  if (!verified) return c.json({ verified: false }, 400);

  // Check if the authenticated user is an admin
  const user = await c.env.DB.prepare("SELECT * FROM Users WHERE id = ?").bind(passkey.user_id).first<User>();
  if (user?.role !== 'admin') {
    return c.json({ error: 'Access denied. Not an administrator.' }, 403);
  }

  // Update the sign counter
  await c.env.DB.prepare('UPDATE Passkeys SET sign_counter = ? WHERE id = ?').bind(authenticationInfo.newCounter, passkey.id).run();
  await c.env.KV_SESSIONS.delete(`challenge:${challenge}`);

  const token = crypto.randomUUID();
  await c.env.KV_SESSIONS.put(`session:${token}`, user.id, { expirationTtl: 60 * 60 * 24 });

  // Return a simplified session token for admin access
  return c.json({ verified: true, token, });
});


app.use('/stats/*', adminAuthMiddleware);
app.use('/users/*', adminAuthMiddleware);
app.use('/threads/*', adminAuthMiddleware);
app.use('/users/*', adminAuthMiddleware);

// 获取统计信息
app.get('/stats', async (c) => {
  const db = c.env.DB;
  const userCount = await db.prepare("SELECT COUNT(*) as count FROM Users").first('count');
  const threadCount = await db.prepare("SELECT COUNT(*) as count FROM Threads").first('count');
  const replyCount = await db.prepare("SELECT COUNT(*) as count FROM Replies").first('count');
  return c.json({ userCount, threadCount, replyCount });
});

app.get('/users', async (c) => {
    const { username, email, uid } = c.req.query();
    const db = c.env.DB;
    let query = "SELECT id, username, email, created_at, role, level FROM Users";
    const conditions: string[] = [];
    const params: any[] = [];

    if (username) {
        conditions.push("username LIKE ?");
        params.push(`%${username}%`);
    }
    if (email) {
        conditions.push("email LIKE ?");
        params.push(`%${email}%`);
    }
    if (uid) {
        conditions.push("id = ?");
        params.push(uid);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY created_at DESC";
    
    const { results } = await db.prepare(query).bind(...params).all();
    return c.json(results);
});

// Get threads with search (FIXED: Now includes search logic)
app.get('/threads', async (c) => {
    const { keyword, author } = c.req.query();
    const db = c.env.DB;
    let query = `
        SELECT t.id, t.title, u.id as author_id, u.username as author, t.created_at, t.reply_count, t.view_count, t.is_pinned, t.node_id, n.name as node_name
        FROM Threads t JOIN Users u ON t.author_id = u.id JOIN Nodes n ON n.id=t.node_id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (keyword) {
        conditions.push("(t.title LIKE ? OR t.body LIKE ?)");
        params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (author) {
        conditions.push("t.author_id=?");
        params.push(author);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY t.is_pinned DESC, t.created_at DESC";

    const { results } = await db.prepare(query).bind(...params).all();
    return c.json(results);
});

// Toggle pin status for threads
const pinSchema = z.object({
  ids: z.array(z.number()),
  isPinned: z.boolean(),
});
app.put('/threads/pin', zValidator('json', pinSchema), async (c) => {
    const { ids, isPinned } = c.req.valid('json');
    if (ids.length === 0) return c.json({ message: "No threads selected" }, 400);
    
    const placeholders = ids.map(() => '?').join(',');
    const query = `UPDATE Threads SET is_pinned = ? WHERE id IN (${placeholders})`;
    await c.env.DB.prepare(query).bind(isPinned, ...ids).run();

    const action = isPinned ? '置顶' : '取消置顶';
    return c.json({ message: `操作成功: ${ids.length} 个帖子已${action}` });
});

// Move threads to a different node
const moveSchema = z.object({
  ids: z.array(z.number()),
  targetNodeId: z.number().int(),
});
app.put('/threads/move', zValidator('json', moveSchema), async (c) => {
    const { ids, targetNodeId } = c.req.valid('json');
    if (ids.length === 0) return c.json({ message: "No threads selected" }, 400);

    const placeholders = ids.map(() => '?').join(',');
    const query = `UPDATE Threads SET node_id = ? WHERE id IN (${placeholders})`;
    await c.env.DB.prepare(query).bind(targetNodeId, ...ids).run();

    return c.json({ message: `操作成功: ${ids.length} 个帖子已移动` });
});


// Delete threads
app.delete('/threads', zValidator('json', z.object({ ids: z.array(z.number()) })), async (c) => { /* ... */ });


// 新增：Get replies with search
app.get('/replies', async (c) => {
    const { keyword, author } = c.req.query();
    const db = c.env.DB;
    let query = `
        SELECT 
            r.id, r.body, r.created_at,
            u.id as author_id, u.username as author,
            t.id as thread_id, t.title as thread_title,
            t.node_id as node_id,
            n.name as node_name
        FROM Replies r
        JOIN Users u ON r.author_id = u.id
        JOIN Threads t ON r.thread_id = t.id
        JOIN Nodes n ON t.node_id = n.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];
    if (keyword) { conditions.push("r.body LIKE ?"); params.push(`%${keyword}%`); }
    if (author) { conditions.push("u.username LIKE ?"); params.push(`%${author}%`); }
    if (conditions.length > 0) { query += " WHERE " + conditions.join(" AND "); }
    query += " ORDER BY r.created_at DESC";
    const { results } = await db.prepare(query).bind(...params).all();
    return c.json(results);
});

// 新增: Delete replies
app.delete('/replies', zValidator('json', z.object({ ids: z.array(z.number()) })), async (c) => {
    const { ids } = c.req.valid('json');
    if (ids.length === 0) return c.json({ message: "No replies selected" }, 400);

    const placeholders = ids.map(() => '?').join(',');
    await c.env.DB.prepare(`DELETE FROM Replies WHERE id IN (${placeholders})`).bind(...ids).run();
    return c.json({ message: `${ids.length} a été supprimé` });
});

// --- User Management Routes ---
// Get/Search Users
app.get('/users', async (c) => {
    const { username, email, uid } = c.req.query();
    const db = c.env.DB;
    let query = "SELECT id, username, email, created_at, role, level FROM Users";
    const conditions: string[] = [];
    const params: any[] = [];

    if (username) {
        conditions.push("username LIKE ?");
        params.push(`%${username}%`);
    }
    if (email) {
        conditions.push("email LIKE ?");
        params.push(`%${email}%`);
    }
     if (uid) {
        conditions.push("id = ?");
        params.push(uid);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY created_at DESC";
    
    const { results } = await db.prepare(query).bind(...params).all();
    return c.json(results);
});

// Get single user details
app.get('/users/:id', async (c) => {
    const { id } = c.req.param();
    const userQuery = `
        SELECT u.id, u.username, u.email, u.created_at, u.role, u.level, c.balance as credits
        FROM Users u
        LEFT JOIN Credits c ON u.id = c.user_id
        WHERE u.id = ?
    `;
    const user = await c.env.DB.prepare(userQuery).bind(id).first();
    if (!user) return c.json({ error: "User not found" }, 404);
    return c.json(user);
});

// Update user details
const updateUserSchema = z.object({
    level: z.number().int(),
    credits: z.number().int(),
    role: z.enum(['user', 'admin']),
});
app.put('/users/:id', zValidator('json', updateUserSchema), async (c) => {
    const { id } = c.req.param();
    const { level, credits, role } = c.req.valid('json');
    const db = c.env.DB;

    await db.batch([
        db.prepare("UPDATE Users SET level = ?, role = ? WHERE id = ?").bind(level, role, id),
        db.prepare("INSERT OR REPLACE INTO Credits (user_id, balance, last_updated) VALUES (?, ?, ?)")
          .bind(id, credits, Date.now() / 1000)
    ]);
    
    return c.json({ message: "User updated successfully" });
});


export default app;
