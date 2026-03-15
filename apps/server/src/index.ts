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
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  // ═══ PLUGINS ═══
  await app.register(fastifyCors, {
    origin: true,
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

  // ═══ API ROUTES ═══
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(leaderboardRoutes, { prefix: '/api' });

  // ═══ WEBSOCKET ═══
  await app.register(registerWebSocket);

  // ═══ STATIC FILES (serve client build) ═══
  const clientDist = path.resolve(__dirname, '../../client/dist');
  const legacyIndex = path.resolve(__dirname, '../../../index.html');

  app.get('/*', async (req, reply) => {
    // Try client dist first, then legacy index.html
    const urlPath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(clientDist, urlPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return reply.sendFile(urlPath, clientDist);
    }

    // Fallback to legacy index.html
    if (fs.existsSync(legacyIndex)) {
      return reply.type('text/html').send(fs.readFileSync(legacyIndex));
    }

    return reply.status(404).send({ error: 'Not found' });
  });

  // ═══ CONNECT SERVICES ═══
  try {
    await getRedis().ping();
    console.log('[Server] Redis connected');
  } catch (err) {
    console.warn('[Server] Redis not available, running without cache');
  }

  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    console.log('[Server] PostgreSQL connected');
  } catch (err) {
    console.warn('[Server] PostgreSQL not available, running in limited mode');
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
