import { Hono } from 'hono';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import type { Bindings, Passkey } from '../types';
import { getPasskeyById } from '../lib/passkeys';

// Admin Auth Middleware
const adminAuthMiddleware = async (c: any, next: any) => {
  // 在真实应用中，这里应验证 JWT 或 session token
  const adminSession = c.req.header('X-Admin-Session');
  if (adminSession !== 'valid-admin-session-token') { // 简化演示
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

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

  console.log(11);

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

  console.log(22);
  const { verified, authenticationInfo } = verification;
  if (!verified) return c.json({ verified: false }, 400);

  // Check if the authenticated user is an admin
  const user = await c.env.DB.prepare("SELECT role FROM Users WHERE id = ?").bind(passkey.user_id).first<{ role: string }>();
  if (user?.role !== 'admin') {
    return c.json({ error: 'Access denied. Not an administrator.' }, 403);
  }

  // Update the sign counter
  await c.env.DB.prepare('UPDATE Passkeys SET sign_counter = ? WHERE id = ?').bind(authenticationInfo.newCounter, passkey.id).run();
  await c.env.KV_SESSIONS.delete(`challenge:${challenge}`);

  // Return a simplified session token for admin access
  return c.json({ verified: true, token: 'valid-admin-session-token' });
});


app.use('/stats/*', adminAuthMiddleware);
app.use('/users/*', adminAuthMiddleware);
app.use('/threads/*', adminAuthMiddleware);

// 获取统计信息
app.get('/stats', async (c) => {
  const db = c.env.DB;
  const userCount = await db.prepare("SELECT COUNT(*) as count FROM Users").first('count');
  const threadCount = await db.prepare("SELECT COUNT(*) as count FROM Threads").first('count');
  const replyCount = await db.prepare("SELECT COUNT(*) as count FROM Replies").first('count');
  return c.json({ userCount, threadCount, replyCount });
});

// 获取用户列表
app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, username, email, created_at, role FROM Users ORDER BY created_at DESC").all();
  return c.json(results);
});

// 获取帖子列表
app.get('/threads', async (c) => {
  const query = `
        SELECT t.id, t.title, u.username as author, t.created_at
        FROM Threads t JOIN Users u ON t.author_id = u.id
        ORDER BY t.created_at DESC
    `;
  const { results } = await c.env.DB.prepare(query).all();
  return c.json(results);
});

export default app;
