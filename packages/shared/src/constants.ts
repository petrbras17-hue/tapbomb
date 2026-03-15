// ═══ GAME BALANCE CONSTANTS ═══
export const GAME = {
  // Energy
  ENERGY_DEFAULT: 1000,
  ENERGY_REGEN_PER_SEC: 1,
  ENERGY_COST_PER_TAP: 1,

  // Taps
  TAP_BASE_VALUE: 1,
  TAP_RATE_LIMIT_PER_SEC: 25,
  TAP_MIN_INTERVAL_MS: 30,
  TAP_COMBO_WINDOW_MS: 300,
  TAP_COMBO_DISPLAY_THRESHOLD: 10,

  // Defuse minigame
  DEFUSE_TRIGGER_TAPS: 100,
  DEFUSE_REQUIRED_TAPS: 30,
  DEFUSE_TIME_LIMIT_SEC: 5.0,
  DEFUSE_REWARD_MULTIPLIER: 100,

  // Offline
  OFFLINE_MAX_HOURS: 4,

  // Levels
  LEVEL_FORMULA_DIVISOR: 100, // level = floor(sqrt(totalTaps / 100)) + 1

  // Referrals
  REFERRAL_COMMISSION_RATE: 0.10, // 10%

  // Anti-cheat
  TRUST_SCORE_DEFAULT: 1.0,
  TRUST_SCORE_SHADOW_BAN: 0.3,
  ANTICHEAT_STDDEV_THRESHOLD: 5, // ms — below this = bot
  ANTICHEAT_MAX_SUSTAINED_TPM: 1200, // taps per minute

  // Flush
  REDIS_FLUSH_INTERVAL_MS: 5000,
  LEADERBOARD_PUSH_INTERVAL_MS: 10000,
  WS_HEARTBEAT_INTERVAL_MS: 30000,
  WS_IDLE_TIMEOUT_MS: 60000,
} as const;

// ═══ SHOP ITEMS ═══
export const SHOP_ITEMS = {
  boosts: [
    { key: 'energy_refill', name: 'Energy Refill', desc: 'Full energy restore', price: 500, rarity: 'common' as const },
    { key: 'x2_boost', name: 'x2 Boost', desc: '2x multiplier (2hr)', price: 2000, rarity: 'rare' as const },
    { key: 'auto_tap', name: 'Auto-Tap', desc: 'Auto tap for 1 hour', price: 5000, rarity: 'epic' as const },
    { key: 'energy_plus', name: 'Energy+500', desc: 'Max energy +500', price: 10000, rarity: 'legendary' as const },
  ],
  skins: [
    { key: 'neon_c4', name: 'Neon C4', desc: '+5% per tap', price: 1000, rarity: 'rare' as const },
    { key: 'gold_c4', name: 'Gold C4', desc: '+15% tap, +50/hr', price: 10000, rarity: 'epic' as const },
    { key: 'dragon_lore', name: 'Dragon Lore', desc: '+50% tap, +500/hr', price: 100000, rarity: 'legendary' as const },
    { key: 'karambit', name: 'Karambit Bomb', desc: '+100% tap, +5K/hr', price: 1000000, rarity: 'legendary' as const },
  ],
} as const;

// ═══ QUEST TEMPLATES ═══
export const QUEST_TEMPLATES = [
  { key: 'tap_500', name: 'Tap 500 times', target: 500, reward: 500, type: 'taps' as const },
  { key: 'use_energy', name: 'Use all energy', target: 1, reward: 200, type: 'energy_depleted' as const },
  { key: 'combo_20', name: 'Reach 20x combo', target: 20, reward: 1000, type: 'combo' as const },
  { key: 'defuse_3', name: 'Defuse 3 bombs', target: 3, reward: 2000, type: 'defuse' as const },
  { key: 'level_5', name: 'Reach Level 5', target: 5, reward: 5000, type: 'level' as const },
  { key: 'invite_3', name: 'Invite 3 friends', target: 3, reward: 10000, type: 'referrals' as const },
] as const;

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
