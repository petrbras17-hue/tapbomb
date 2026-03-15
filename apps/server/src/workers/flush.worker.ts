import { getRedis, KEYS } from '../plugins/redis.js';
import { getDb } from '../plugins/db.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { GAME } from '@tapbomb/shared';

let consecutiveErrors = 0;

// ═══ Flushes dirty user state from Redis to PostgreSQL every 5 seconds ═══
export function startFlushWorker() {
  setInterval(async () => {
    try {
      const redis = getRedis();
      const dirtyIds = await redis.smembers(KEYS.dirtyUsers);
      if (dirtyIds.length === 0) return;

      const db = getDb();

      for (const idStr of dirtyIds) {
        try {
          const userId = parseInt(idStr, 10);
          const hot = await redis.hgetall(KEYS.userHot(userId));

          // If hot state expired, remove from dirty set
          if (!hot || !hot.balance) {
            await redis.srem(KEYS.dirtyUsers, idStr);
            continue;
          }

          await db.update(users).set({
            balance: parseInt(hot.balance, 10),
            totalTaps: parseInt(hot.totalTaps || '0', 10),
            energy: parseInt(hot.energy || '1000', 10),
            trustScore: parseFloat(hot.trustScore || '1.0'),
            lastActive: new Date(),
            lastEnergyTs: new Date(parseInt(hot.lastEnergyTs || Date.now().toString(), 10)),
          }).where(eq(users.id, userId));

          // Update leaderboard sorted set
          await redis.zadd(KEYS.leaderboard, parseInt(hot.balance, 10), idStr);

          await redis.srem(KEYS.dirtyUsers, idStr);
        } catch (err) {
          console.error(`[Flush] Error flushing user ${idStr}:`, err);
        }
      }

      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      // Only log every 10th consecutive error to avoid log flooding
      if (consecutiveErrors <= 3 || consecutiveErrors % 10 === 0) {
        console.error(`[Flush] Worker error (consecutive: ${consecutiveErrors}):`, err);
      }
    }
  }, GAME.REDIS_FLUSH_INTERVAL_MS);

  console.log(`[Flush] Worker started (interval: ${GAME.REDIS_FLUSH_INTERVAL_MS}ms)`);
}
