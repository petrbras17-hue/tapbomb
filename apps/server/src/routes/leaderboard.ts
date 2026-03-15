import type { FastifyInstance } from 'fastify';
import { getRedis, KEYS } from '../plugins/redis.js';
import { getDb } from '../plugins/db.js';
import { users } from '../db/schema.js';
import { inArray } from 'drizzle-orm';
import type { LeaderboardEntry } from '@tapbomb/shared';

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get('/leaderboard', async (req, reply) => {
    try {
      const redis = getRedis();

      // Get top 100 from Redis sorted set
      const top = await redis.zrevrange(KEYS.leaderboard, 0, 99, 'WITHSCORES');

      if (top.length === 0) {
        return reply.send({ entries: [] });
      }

      // Parse userId:score pairs
      const userIds: number[] = [];
      const scores: Map<number, number> = new Map();
      for (let i = 0; i < top.length; i += 2) {
        const userId = parseInt(top[i], 10);
        const score = parseInt(top[i + 1], 10);
        userIds.push(userId);
        scores.set(userId, score);
      }

      // Fetch user details from DB
      const db = getDb();
      const dbUsers = await db.select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
      }).from(users).where(inArray(users.id, userIds));

      const userMap = new Map(dbUsers.map(u => [u.id, u]));

      const entries: LeaderboardEntry[] = userIds.map((id, idx) => ({
        rank: idx + 1,
        userId: id,
        username: userMap.get(id)?.username || null,
        firstName: userMap.get(id)?.firstName || 'Player',
        balance: scores.get(id) || 0,
      }));

      return reply.send({ entries });
    } catch (err) {
      req.log.error(err, '[Leaderboard] Failed to fetch leaderboard');
      return reply.status(500).send({ error: 'Failed to load leaderboard' });
    }
  });
}
