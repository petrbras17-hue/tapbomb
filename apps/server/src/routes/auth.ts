import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { validateTelegramInitData } from '../plugins/telegram.js';
import { getDb } from '../plugins/db.js';
import { users } from '../db/schema.js';
import { config } from '../config.js';
import { initUserHotState } from '../services/tap.service.js';
import { trackSessionStart } from '../services/analytics.service.js';
import { calculateOfflineEarnings } from '@tapbomb/shared';
import type { AuthResponse, UserPublic } from '@tapbomb/shared';

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { initData: string; deviceInfo?: string } }>('/auth/telegram', async (req, reply) => {
    const { initData, deviceInfo } = req.body;

    const parsed = validateTelegramInitData(initData);
    if (!parsed) {
      return reply.status(401).send({ error: 'Invalid Telegram init data' });
    }

    const db = getDb();
    const { user: tgUser, startParam } = parsed;

    // Upsert user
    let [dbUser] = await db.select().from(users).where(eq(users.id, tgUser.id)).limit(1);

    if (!dbUser) {
      // Parse referral from start_param
      let referredBy: number | null = null;
      if (startParam?.startsWith('ref_')) {
        referredBy = parseInt(startParam.replace('ref_', ''), 10) || null;
      }

      [dbUser] = await db.insert(users).values({
        id: tgUser.id,
        username: tgUser.username || null,
        firstName: tgUser.first_name,
        referredBy,
      }).returning();
    } else {
      // Update last active and username
      [dbUser] = await db.update(users)
        .set({
          lastActive: new Date(),
          username: tgUser.username || dbUser.username,
          firstName: tgUser.first_name || dbUser.firstName,
        })
        .where(eq(users.id, tgUser.id))
        .returning();

      // Calculate offline earnings
      const offlineMs = Date.now() - dbUser.lastActive.getTime();
      const offlineEarnings = calculateOfflineEarnings(dbUser.passivePerHr, offlineMs);
      if (offlineEarnings > 0) {
        [dbUser] = await db.update(users)
          .set({ balance: dbUser.balance + offlineEarnings })
          .where(eq(users.id, tgUser.id))
          .returning();
      }
    }

    // Initialize hot state in Redis
    await initUserHotState(dbUser.id, dbUser);

    // Track session
    await trackSessionStart(dbUser.id, deviceInfo);

    // Generate JWT
    const token = jwt.sign(
      { userId: dbUser.id, username: dbUser.username },
      config.jwtSecret,
      { expiresIn: '24h' },
    );

    const userPublic: UserPublic = {
      id: dbUser.id,
      username: dbUser.username,
      firstName: dbUser.firstName,
      balance: dbUser.balance,
      totalTaps: dbUser.totalTaps,
      energy: dbUser.energy,
      energyMax: dbUser.energyMax,
      multiplier: dbUser.multiplier,
      level: dbUser.level,
      passivePerHr: dbUser.passivePerHr,
      skin: dbUser.skin,
    };

    const response: AuthResponse = { token, user: userPublic };
    return reply.send(response);
  });
}
