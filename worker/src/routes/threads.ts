import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../auth/middleware';
import type { Bindings, Thread, ThreadWithAuthor, ReplyWithAuthor, CommentWithAuthor, User } from '../types';

const app = new Hono<{ Bindings: Bindings, Variables: { user: User } }>();

// 获取某个节点下的帖子列表 (分页)
const listThreadsSchema = z.object({
    nodeId: z.string().transform(Number),
    page: z.string().transform(Number).default('1'),
});

app.get('/', zValidator('query', listThreadsSchema), async (c) => {
    const { nodeId, page } = c.req.valid('query');
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
        const query = c.env.DB.prepare(`
            SELECT t.*, u.username as author_username, u.avatar_r2_key as author_avatar_r2_key, last_reply_user.username as last_reply_username
            FROM Threads t
            JOIN Users u ON t.author_id = u.id
            LEFT JOIN Users last_reply_user ON t.last_reply_user_id = last_reply_user.id
            WHERE t.node_id = ?
            ORDER BY t.is_pinned DESC, t.last_reply_at DESC, t.created_at DESC
            LIMIT ? OFFSET ?
        `).bind(nodeId, limit, offset);

        const { results } = await query.all<ThreadWithAuthor>();
        return c.json(results || []);
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Failed to fetch threads' }, 500);
    }
});


// 创建一个新帖子
const createThreadSchema = z.object({
  nodeId: z.number().int().positive(),
  title: z.string().min(5).max(150),
  body: z.string().min(10),
});

app.post('/', authMiddleware, zValidator('json', createThreadSchema), async (c) => {
    const { nodeId, title, body } = c.req.valid('json');
    const user = c.get('user');
    const now = Math.floor(Date.now() / 1000);

    // 1. 将帖子正文存入 R2
    const bodyR2Key = `thread-body/${crypto.randomUUID()}`;
    await c.env.R2_BUCKET.put(bodyR2Key, body);

    // 2. 将帖子元数据存入 D1，并更新版块计数
    try {
        const { meta } = await c.env.DB.prepare(
            `INSERT INTO Threads (node_id, author_id, title, created_at, last_reply_at, body) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(nodeId, user.id, title, now, now, body).run(); // 直接插入 body
        
        const newThreadId = meta.last_row_id;

        // 3. 使用 batch 更新版块计数和用户积分
        await c.env.DB.batch([
            c.env.DB.prepare('UPDATE Nodes SET thread_count = thread_count + 1 WHERE id = ?').bind(nodeId),
            c.env.DB.prepare('UPDATE Credits SET balance = balance + 5, last_updated = ? WHERE user_id = ?').bind(now, user.id)
        ]);

        return c.json({ message: 'Thread created successfully', threadId: meta.last_row_id }, 201);
    } catch (e) {
        console.error(e);
        // 如果数据库操作失败，应该考虑删除已上传到 R2 的对象
        await c.env.R2_BUCKET.delete(bodyR2Key);
        return c.json({ error: 'Failed to create thread' }, 500);
    }
});


// 获取单个帖子的详细信息 (已简化)
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        const thread = await db.prepare(`SELECT t.*, u.username as author_username FROM Threads t JOIN Users u ON t.author_id = u.id WHERE t.id = ?`).bind(id).first<ThreadWithAuthor>();
        if (!thread) return c.json({ error: 'Thread not found' }, 404);

        const repliesQuery = `
            SELECT r.*, u.username as author_username, qr.body as quoted_body, qu.username as quoted_author, qr.created_at as quoted_created_at
            FROM Replies r
            JOIN Users u ON r.author_id = u.id
            LEFT JOIN Replies qr ON r.reply_to_id = qr.id
            LEFT JOIN Users qu ON qr.author_id = qu.id
            WHERE r.thread_id = ? ORDER BY r.created_at ASC
        `;
        const { results: replies } = await db.prepare(repliesQuery).bind(id).all<ReplyWithAuthor>();
        
        await db.prepare('UPDATE Threads SET view_count = view_count + 1 WHERE id = ?').bind(id).run();

        return c.json({ ...thread, replies: replies || [] });
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Failed to fetch thread details' }, 500);
    }
});

// 发布回复
const createReplySchema = z.object({ body: z.string().min(1), replyToId: z.number().int().positive().optional() });

app.post('/:threadId/replies', authMiddleware, zValidator('json', createReplySchema), async (c) => {
    const threadId = parseInt(c.req.param('threadId'), 10);
    const { body, replyToId } = c.req.valid('json');
    const user = c.get('user');
    const now = Math.floor(Date.now() / 1000);
    const db = c.env.DB;

    try {
        const { meta } = await db.prepare(
            `INSERT INTO Replies (thread_id, author_id, created_at, body, reply_to_id) VALUES (?, ?, ?, ?, ?)`
        ).bind(threadId, user.id, now, body, replyToId || null).run(); // 直接插入 body

        const newReplyId = meta.last_row_id;

        // 3. 使用 batch 更新帖子和版块的回复计数、最后回复时间以及用户积分
        await c.env.DB.batch([
            c.env.DB.prepare(
                `UPDATE Threads 
                 SET reply_count = reply_count + 1, last_reply_at = ?, last_reply_user_id = ? 
                 WHERE id = ?`
            ).bind(now, user.id, threadId),
            c.env.DB.prepare(
                `UPDATE Nodes 
                 SET reply_count = reply_count + 1 
                 WHERE id = (SELECT node_id FROM Threads WHERE id = ?)`
            ).bind(threadId),
             c.env.DB.prepare('UPDATE Credits SET balance = balance + 1, last_updated = ? WHERE user_id = ?').bind(now, user.id)
        ]);

        return c.json({ message: 'Reply posted successfully', replyId: meta.last_row_id }, 201);

    } catch (e) {
        console.error(e);
        await c.env.R2_BUCKET.delete(bodyR2Key);
        return c.json({ error: 'Failed to post reply' }, 500);
    }
});

export default app;
