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
  origin: ['http://localhost:5173', 'http://127.0.0.1:8788', 'https://serverless-bbs.pages.dev', 'https://*.serverless-bbs.pages.dev', 'https://serverless-bbs.anquanssl.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const api = new Hono();

app.use('*', tryAuthMiddleware);

app.get('/', async (c) => {
  const headers = new (globalThis as any).Headers();
  headers.set('Content-Type', `text/html; charset=utf-8`);
  const html = `<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <title>API 说明</title>
</head>
<body>
  此地址为API地址，您还需要打包部署前端页面，<br/>请修改 <kbd>wrangler.jsonc</kbd> 中的
<pre>
{
  "vars": {
    "RP_ID": "<span class='x'></span>",
    "ORIGIN": "https://<span class='x'></span>",
  }
}</pre>
后再执行 <kbd>yarn deploy</kbd> 部署到 Pages。详细部署教程见：<a href="https://github.com/serverless-bbs/serverless-bbs/blob/master/%E9%83%A8%E7%BD%B2%E6%8C%87%E5%8D%97.md">部署指南.md</a>
<script>
document.querySelectorAll('.x').forEach(e => e.innerHTML = location.hostname)
</script>
</body>
</html>`;

  return new Response(html, {
    headers,
  });
});

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
