import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import type { Bindings } from './types';
import auth from './routes/auth';
import nodes from './routes/nodes';
import threads from './routes/threads';
import comments from './routes/comments';
import users from './routes/users';
import messages from './routes/messages'; // 1. 引入新的路由
import reminders from './routes/reminders'; // 1. 引入新路由
import search from './routes/search'; // 1. 引入新路由
import rankings from './routes/rankings';
import { tryAuthMiddleware } from './auth/tryAuthMiddleware';

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', logger());
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:8788'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const api = new Hono();

app.use('*', tryAuthMiddleware);

api.route('/auth', auth);
api.route('/nodes', nodes);
api.route('/threads', threads);
api.route('/comments', comments);
api.route('/users', users);
api.route('/messages', messages); // 2. 挂载私信路由
api.route('/messages', messages);
api.route('/reminders', reminders); // 2. 挂载新路由
api.route('/search', search);
api.route('/rankings', rankings); // 2. 挂载排行榜路由

app.get('/avatars/:key{.+$}', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.R2_BUCKET.get(key);

  if (object === null) {
    return c.notFound();
  }

  // Use the Cloudflare Workers' Headers class for compatibility with R2
  const headers = new (globalThis as any).Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body as any, {
    headers,
  });
});


app.route('/api', api);

app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
