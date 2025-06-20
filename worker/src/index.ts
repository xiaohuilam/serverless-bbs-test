import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import type { Bindings } from './types';
import auth from './routes/auth';
import nodes from './routes/nodes';
import threads from './routes/threads';
import comments from './routes/comments';
import users from './routes/users';
import messages from './routes/messages';
import reminders from './routes/reminders';
import search from './routes/search';
import rankings from './routes/rankings';
import images from './routes/images';
import config from './routes/config';
import { tryAuthMiddleware } from './auth/tryAuthMiddleware';

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', logger());
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:8788', 'https://serverless-bbs.pages.dev', 'https://*.serverless-bbs.pages.dev'],
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
api.route('/messages', messages);
api.route('/messages', messages);
api.route('/reminders', reminders);
api.route('/search', search);
api.route('/rankings', rankings);
api.route('/images', images);
api.route('/config', config);

app.get('/r2/:key{.+$}', async (c) => {
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
