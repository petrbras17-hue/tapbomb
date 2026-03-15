import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb } from '../plugins/db.js';
import { users, purchases } from '../db/schema.js';
import { getRedis, KEYS } from '../plugins/redis.js';
import { authGuard } from '../plugins/auth-guard.js';
import { trackPurchase } from '../services/analytics.service.js';
import { SHOP_ITEMS } from '@tapbomb/shared';

// All shop items flattened for lookup
const ALL_ITEMS = [
  ...SHOP_ITEMS.boosts.map(i => ({ ...i, category: 'boost' as const })),
  ...SHOP_ITEMS.skins.map(i => ({ ...i, category: 'skin' as const })),
];

// Upgrade cards (not in shared constants, defined here)
const UPGRADES = [
  { key: 'kevlar', name: 'Kevlar Vest', baseIncome: 10, basePrice: 500 },
  { key: 'awp', name: 'AWP Training', baseIncome: 50, basePrice: 5000 },
  { key: 'server', name: 'Server Farm', baseIncome: 500, basePrice: 50000 },
  { key: 'esports', name: 'Esports Team', baseIncome: 5000, basePrice: 500000 },
];

function getUpgradePrice(basePrice: number, level: number): number {
  return Math.floor(basePrice * Math.pow(1.5, level));
}

function getUpgradeIncome(baseIncome: number, level: number): number {
  return Math.floor(baseIncome * Math.pow(1.2, level));
}

export async function shopRoutes(app: FastifyInstance) {
  // All shop routes require auth
  app.addHook('preHandler', authGuard);

  // GET /shop/items — catalog
  app.get('/shop/items', async (_req, reply) => {
    return reply.send({
      boosts: SHOP_ITEMS.boosts,
      skins: SHOP_ITEMS.skins,
      upgrades: UPGRADES,
    });
  });

  // POST /shop/purchase — buy boost or skin
  app.post<{ Body: { itemKey: string } }>('/shop/purchase', async (req, reply) => {
    const userId = (req as any).userId as number;
    const { itemKey } = req.body;

    const item = ALL_ITEMS.find(i => i.key === itemKey);
    if (!item) {
      return reply.status(400).send({ error: 'Unknown item' });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (user.balance < item.price) {
      return reply.status(400).send({ error: 'Insufficient balance', required: item.price, current: user.balance });
    }

    // Apply item effect
    const updates: Record<string, any> = { balance: user.balance - item.price };

    if (item.key === 'energy_refill') {
      updates.energy = user.energyMax;
    } else if (item.key === 'x2_boost') {
      updates.multiplier = 2;
    } else if (item.key === 'energy_plus') {
      updates.energyMax = user.energyMax + 500;
      updates.energy = user.energy + 500;
    } else if (item.category === 'skin') {
      updates.skin = item.key;
      // Skins give passive income bonuses
      if (item.key === 'gold_c4') updates.passivePerHr = user.passivePerHr + 50;
      else if (item.key === 'dragon_lore') updates.passivePerHr = user.passivePerHr + 500;
      else if (item.key === 'karambit') updates.passivePerHr = user.passivePerHr + 5000;
    }

    const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();

    // Record purchase
    await db.insert(purchases).values({
      userId,
      itemKey: item.key,
      pricePaid: item.price,
    });

    // Update Redis hot state
    try {
      const redis = getRedis();
      const hot = KEYS.userHot(userId);
      await redis.hmset(hot, {
        balance: updated.balance.toString(),
        energy: updated.energy.toString(),
        energyMax: updated.energyMax.toString(),
        multiplier: updated.multiplier.toString(),
      });
    } catch { /* Redis optional */ }

    await trackPurchase(userId, item.key, item.price);

    return reply.send({
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        firstName: updated.firstName,
        balance: updated.balance,
        totalTaps: updated.totalTaps,
        energy: updated.energy,
        energyMax: updated.energyMax,
        multiplier: updated.multiplier,
        level: updated.level,
        passivePerHr: updated.passivePerHr,
        skin: updated.skin,
      },
    });
  });

  // POST /shop/upgrade — buy upgrade card level
  app.post<{ Body: { upgradeKey: string } }>('/shop/upgrade', async (req, reply) => {
    const userId = (req as any).userId as number;
    const { upgradeKey } = req.body;

    const upgrade = UPGRADES.find(u => u.key === upgradeKey);
    if (!upgrade) {
      return reply.status(400).send({ error: 'Unknown upgrade' });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return reply.status(404).send({ error: 'User not found' });

    // Get current level from purchases count
    const userPurchases = await db.select().from(purchases)
      .where(eq(purchases.userId, userId));
    const currentLevel = userPurchases.filter(p => p.itemKey === `upgrade_${upgradeKey}`).length;

    const price = getUpgradePrice(upgrade.basePrice, currentLevel);
    if (user.balance < price) {
      return reply.status(400).send({ error: 'Insufficient balance', required: price, current: user.balance });
    }

    const incomeGain = getUpgradeIncome(upgrade.baseIncome, currentLevel);
    const [updated] = await db.update(users).set({
      balance: user.balance - price,
      passivePerHr: user.passivePerHr + incomeGain,
    }).where(eq(users.id, userId)).returning();

    await db.insert(purchases).values({
      userId,
      itemKey: `upgrade_${upgradeKey}`,
      pricePaid: price,
    });

    // Update Redis
    try {
      const redis = getRedis();
      await redis.hmset(KEYS.userHot(userId), {
        balance: updated.balance.toString(),
      });
    } catch { /* Redis optional */ }

    await trackPurchase(userId, `upgrade_${upgradeKey}`, price);

    return reply.send({
      success: true,
      newLevel: currentLevel + 1,
      incomeGain,
      user: {
        id: updated.id,
        username: updated.username,
        firstName: updated.firstName,
        balance: updated.balance,
        totalTaps: updated.totalTaps,
        energy: updated.energy,
        energyMax: updated.energyMax,
        multiplier: updated.multiplier,
        level: updated.level,
        passivePerHr: updated.passivePerHr,
        skin: updated.skin,
      },
    });
  });
}
