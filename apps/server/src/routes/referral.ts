import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../plugins/db.js';
import { users, referralEarnings } from '../db/schema.js';
import { authGuard } from '../plugins/auth-guard.js';
import { GAME } from '@tapbomb/shared';

export async function referralRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // GET /referral/info — referral stats for current user
  app.get('/referral/info', async (req, reply) => {
    const userId = (req as any).userId as number;
    const db = getDb();

    // Count referrals
    const referrals = await db.select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.referredBy, userId));
    const referralCount = referrals[0]?.count || 0;

    // Total earnings from referrals
    const earnings = await db.select({ total: sql<number>`coalesce(sum(amount), 0)::int` })
      .from(referralEarnings)
      .where(eq(referralEarnings.referrerId, userId));
    const totalEarnings = earnings[0]?.total || 0;

    return reply.send({
      referralCount,
      totalEarnings,
      commissionRate: GAME.REFERRAL_COMMISSION_RATE,
      referralLink: `https://t.me/tapbomb_bot/app?startapp=ref_${userId}`,
    });
  });

  // GET /referral/list — list of referred users
  app.get('/referral/list', async (req, reply) => {
    const userId = (req as any).userId as number;
    const db = getDb();

    const referees = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      totalTaps: users.totalTaps,
      createdAt: users.createdAt,
    })
      .from(users)
      .where(eq(users.referredBy, userId));

    return reply.send({ referees });
  });

  // POST /referral/claim-commission — calculate and distribute pending commissions
  app.post('/referral/claim-commission', async (req, reply) => {
    const userId = (req as any).userId as number;
    const db = getDb();

    // Get all referees
    const referees = await db.select({
      id: users.id,
      totalTaps: users.totalTaps,
    })
      .from(users)
      .where(eq(users.referredBy, userId));

    if (referees.length === 0) {
      return reply.send({ earned: 0, message: 'No referrals yet' });
    }

    // Get already-earned amounts per referee
    const existingEarnings = await db.select({
      refereeId: referralEarnings.refereeId,
      total: sql<number>`coalesce(sum(amount), 0)::int`,
    })
      .from(referralEarnings)
      .where(eq(referralEarnings.referrerId, userId))
      .groupBy(referralEarnings.refereeId);

    const earnedMap = new Map(existingEarnings.map(e => [e.refereeId, e.total]));

    let totalNewEarnings = 0;
    const newEntries: { referrerId: number; refereeId: number; amount: number }[] = [];

    for (const referee of referees) {
      const totalCommission = Math.floor(referee.totalTaps * GAME.REFERRAL_COMMISSION_RATE);
      const alreadyEarned = earnedMap.get(referee.id) || 0;
      const newEarning = totalCommission - alreadyEarned;

      if (newEarning > 0) {
        totalNewEarnings += newEarning;
        newEntries.push({
          referrerId: userId,
          refereeId: referee.id,
          amount: newEarning,
        });
      }
    }

    if (totalNewEarnings > 0) {
      // Record earnings
      await db.insert(referralEarnings).values(newEntries);

      // Credit to user balance
      const [updated] = await db.update(users)
        .set({ balance: sql`balance + ${totalNewEarnings}` })
        .where(eq(users.id, userId))
        .returning();

      return reply.send({
        earned: totalNewEarnings,
        newBalance: updated.balance,
        referralCount: referees.length,
      });
    }

    return reply.send({ earned: 0, message: 'No new commissions' });
  });
}
