import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../auth/middleware';
import type { Bindings, User } from '../types';

const app = new Hono<{ Bindings: Bindings, Variables: { user: User } }>();

const createCommentSchema = z.object({
  parentId: z.number().int().positive(),
  parentType: z.enum(['thread', 'reply']),
  body: z.string().min(1),
});

// 创建新评论 (可以是对帖子或对回复的评论)
app.post('/', authMiddleware, zValidator('json', createCommentSchema), async (c) => {
    const { parentId, parentType, body } = c.req.valid('json');
    const user = c.get('user');
    const now = Math.floor(Date.now() / 1000);
    
    // 1. 将评论正文存入 R2
    const bodyR2Key = `comment-body/${crypto.randomUUID()}`;
    await c.env.R2_BUCKET.put(bodyR2Key, body);

    try {
        // 2. 将评论元数据存入 D1
        const { meta } = await c.env.DB.prepare(
            `INSERT INTO Comments (parent_id, parent_type, author_id, created_at, body_r2_key)
             VALUES (?, ?, ?, ?, ?)`
        ).bind(parentId, parentType, user.id, now, bodyR2Key).run();

        const newCommentId = meta.last_row_id;

        // 评论通常不计入主要统计数据，但可以奖励少量积分
        await c.env.DB.prepare('UPDATE Credits SET balance = balance + 1, last_updated = ? WHERE user_id = ?')
          .bind(now, user.id).run();

        return c.json({ message: 'Comment posted successfully', commentId: newCommentId }, 201);
    } catch(e) {
        console.error(e);
        await c.env.R2_BUCKET.delete(bodyR2Key);
        return c.json({ error: 'Failed to post comment' }, 500);
    }
});

export default app;
