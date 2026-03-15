import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyWebSocket from '@fastify/websocket';
import fastifyRateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { getRedis } from './plugins/redis.js';
import { getPool } from './plugins/db.js';
import { authRoutes } from './routes/auth.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { registerWebSocket } from './plugins/websocket.js';
import { startFlushWorker } from './workers/flush.worker.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
function getMimeType(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function start() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  // ═══ PLUGINS ═══
  await app.register(fastifyCors, {
    origin: config.allowedOrigins.includes('*') ? true : config.allowedOrigins,
    credentials: true,
  });

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for']?.toString() || req.ip;
    },
  });

  await app.register(fastifyWebSocket);

  // ═══ SECURITY HEADERS ═══
  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'SAMEORIGIN');
    reply.header('Referrer-Policy', 'no-referrer');
  });

  // ═══ API ROUTES ═══
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(leaderboardRoutes, { prefix: '/api' });

  // ═══ WEBSOCKET ═══
  await app.register(registerWebSocket);

  // ═══ STATIC FILES (serve client build) ═══
  const clientDist = path.resolve(__dirname, '../../client/dist');
  const legacyIndex = path.resolve(__dirname, '../../../index.html');

  app.get('/*', async (req, reply) => {
    const urlPath = (req.url === '/' ? '/index.html' : req.url).split('?')[0];
    const filePath = path.resolve(clientDist, '.' + urlPath);

    // Path traversal protection
    if (!filePath.startsWith(clientDist + path.sep) && filePath !== clientDist) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath);
        return reply.type(getMimeType(urlPath)).send(content);
      }
    } catch {
      // File not found in client dist, try legacy
    }

    try {
      const content = await fs.readFile(legacyIndex);
      return reply.type('text/html').send(content);
    } catch {
      return reply.status(404).send({ error: 'Not found' });
    }
  });

  // ═══ CONNECT SERVICES (fail fast in production) ═══
  try {
    await getRedis().ping();
    console.log('[Server] Redis connected');
  } catch (err) {
    console.error('[Server] Redis connection failed:', err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
    console.warn('[Server] Continuing without Redis (dev mode)');
  }

  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    console.log('[Server] PostgreSQL connected');
  } catch (err) {
    console.error('[Server] PostgreSQL connection failed:', err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
    console.warn('[Server] Continuing without PostgreSQL (dev mode)');
  }

  // ═══ START WORKERS ═══
  startFlushWorker();

  // ═══ START SERVER ═══
  await app.listen({ port: config.port, host: config.host });
  console.log(`[Server] TAPBOMB running on http://${config.host}:${config.port}`);
}

start().catch((err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
