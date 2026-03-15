import { pgTable, bigint, varchar, integer, real, timestamp, boolean, serial, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey(), // Telegram user ID
  username: varchar('username', { length: 64 }),
  firstName: varchar('first_name', { length: 128 }).notNull().default('Player'),
  balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  totalTaps: bigint('total_taps', { mode: 'number' }).notNull().default(0),
  energy: integer('energy').notNull().default(1000),
  energyMax: integer('energy_max').notNull().default(1000),
  multiplier: integer('multiplier').notNull().default(1),
  level: integer('level').notNull().default(1),
  passivePerHr: integer('passive_per_hr').notNull().default(0),
  skin: varchar('skin', { length: 32 }).notNull().default('default'),
  referredBy: bigint('referred_by', { mode: 'number' }),
  trustScore: real('trust_score').notNull().default(1.0),
  lastEnergyTs: timestamp('last_energy_ts', { withTimezone: true }).notNull().defaultNow(),
  lastActive: timestamp('last_active', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_users_referred_by').on(table.referredBy),
  index('idx_users_balance').on(table.balance),
]);

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  itemKey: varchar('item_key', { length: 64 }).notNull(),
  pricePaid: bigint('price_paid', { mode: 'number' }).notNull(),
  purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull().defaultNow(),
});

export const questProgress = pgTable('quest_progress', {
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  questKey: varchar('quest_key', { length: 64 }).notNull(),
  progress: integer('progress').notNull().default(0),
  claimed: boolean('claimed').notNull().default(false),
}, (table) => [
  index('idx_quest_user').on(table.userId),
]);

export const tapSessions = pgTable('tap_sessions', {
  id: serial('id').primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  tapCount: integer('tap_count').notNull(),
  earned: bigint('earned', { mode: 'number' }).notNull(),
  durationMs: integer('duration_ms').notNull(),
  avgIntervalMs: real('avg_interval_ms'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('idx_tap_sessions_user').on(table.userId, table.startedAt),
]);

export const referralEarnings = pgTable('referral_earnings', {
  id: serial('id').primaryKey(),
  referrerId: bigint('referrer_id', { mode: 'number' }).notNull().references(() => users.id),
  refereeId: bigint('referee_id', { mode: 'number' }).notNull().references(() => users.id),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Analytics events table for full user behavior tracking
export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  event: varchar('event', { length: 64 }).notNull(),
  screen: varchar('screen', { length: 32 }),
  properties: varchar('properties', { length: 2048 }), // JSON string
  sessionId: varchar('session_id', { length: 64 }),
  deviceInfo: varchar('device_info', { length: 256 }),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_analytics_user').on(table.userId, table.timestamp),
  index('idx_analytics_event').on(table.event, table.timestamp),
]);
