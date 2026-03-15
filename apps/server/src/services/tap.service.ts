import { GAME } from '@tapbomb/shared';
import { getRedis, KEYS } from '../plugins/redis.js';
import type { WsTapOkMessage, WsTapRejectMessage } from '@tapbomb/shared';

interface UserHotState {
  balance: number;
  totalTaps: number;
  energy: number;
  energyMax: number;
  multiplier: number;
  combo: number;
  lastTapTs: number;
  tapsSinceDefuse: number;
  trustScore: number;
  lastEnergyTs: number;
}

export async function loadUserHotState(userId: number): Promise<UserHotState | null> {
  const redis = getRedis();
  const data = await redis.hgetall(KEYS.userHot(userId));
  if (!data || !data.balance) return null;
  return {
    balance: parseInt(data.balance, 10),
    totalTaps: parseInt(data.totalTaps || '0', 10),
    energy: parseInt(data.energy || '1000', 10),
    energyMax: parseInt(data.energyMax || '1000', 10),
    multiplier: parseInt(data.multiplier || '1', 10),
    combo: parseInt(data.combo || '0', 10),
    lastTapTs: parseInt(data.lastTapTs || '0', 10),
    tapsSinceDefuse: parseInt(data.tapsSinceDefuse || '0', 10),
    trustScore: parseFloat(data.trustScore || '1.0'),
    lastEnergyTs: parseInt(data.lastEnergyTs || Date.now().toString(), 10),
  };
}

export async function initUserHotState(userId: number, dbUser: {
  balance: number; totalTaps: number; energy: number; energyMax: number;
  multiplier: number; lastEnergyTs: Date; trustScore: number;
}): Promise<void> {
  const redis = getRedis();
  await redis.hmset(KEYS.userHot(userId), {
    balance: dbUser.balance.toString(),
    totalTaps: dbUser.totalTaps.toString(),
    energy: dbUser.energy.toString(),
    energyMax: dbUser.energyMax.toString(),
    multiplier: dbUser.multiplier.toString(),
    combo: '0',
    lastTapTs: '0',
    tapsSinceDefuse: '0',
    trustScore: dbUser.trustScore.toString(),
    lastEnergyTs: dbUser.lastEnergyTs.getTime().toString(),
  });
  // Expire hot state after 1 hour of inactivity
  await redis.expire(KEYS.userHot(userId), 3600);
}

export async function processTap(
  userId: number,
  clientTs: number,
): Promise<WsTapOkMessage | WsTapRejectMessage | 'defuse'> {
  const redis = getRedis();
  const key = KEYS.userHot(userId);

  // Refresh TTL
  await redis.expire(key, 3600);

  // Get current state
  const state = await loadUserHotState(userId);
  if (!state) return { type: 'tap_reject', reason: 'invalid' };

  // Calculate energy with regen
  const now = Date.now();
  const elapsedSec = (now - state.lastEnergyTs) / 1000;
  const regen = Math.floor(elapsedSec * GAME.ENERGY_REGEN_PER_SEC);
  let currentEnergy = Math.min(state.energy + regen, state.energyMax);

  // Energy check
  if (currentEnergy <= 0) {
    return { type: 'tap_reject', reason: 'no_energy' };
  }

  // Rate limit check
  const sec = Math.floor(now / 1000);
  const rateKey = KEYS.tapRate(userId, sec);
  const tapCount = await redis.incr(rateKey);
  if (tapCount === 1) await redis.expire(rateKey, 2);
  if (tapCount > GAME.TAP_RATE_LIMIT_PER_SEC) {
    return { type: 'tap_reject', reason: 'rate_limit' };
  }

  // Combo calculation
  let combo = state.combo;
  if (state.lastTapTs > 0 && (now - state.lastTapTs) < GAME.TAP_COMBO_WINDOW_MS) {
    combo++;
  } else {
    combo = 1;
  }

  // Calculate earned (shadow-ban: trust < threshold = earn 0)
  const earned = state.trustScore >= GAME.TRUST_SCORE_SHADOW_BAN ? state.multiplier : 0;

  // Update state
  currentEnergy -= GAME.ENERGY_COST_PER_TAP;
  const newBalance = state.balance + earned;
  const newTotalTaps = state.totalTaps + 1;
  const newTapsSinceDefuse = state.tapsSinceDefuse + 1;

  // Check defuse trigger — reset atomically in same pipeline
  const triggerDefuse = newTapsSinceDefuse >= GAME.DEFUSE_TRIGGER_TAPS;

  // Batch update Redis
  const pipeline = redis.pipeline();
  pipeline.hmset(key, {
    balance: newBalance.toString(),
    totalTaps: newTotalTaps.toString(),
    energy: currentEnergy.toString(),
    combo: combo.toString(),
    lastTapTs: now.toString(),
    tapsSinceDefuse: triggerDefuse ? '0' : newTapsSinceDefuse.toString(),
    lastEnergyTs: now.toString(),
  });
  pipeline.sadd(KEYS.dirtyUsers, userId.toString());
  // Track tap for analytics
  pipeline.rpush(KEYS.sessionTaps(userId), `${now}:${earned}`);
  pipeline.expire(KEYS.sessionTaps(userId), 3600);
  await pipeline.exec();

  if (triggerDefuse) {
    return 'defuse';
  }

  return {
    type: 'tap_ok',
    balance: newBalance,
    energy: currentEnergy,
    combo,
    earned: state.multiplier, // show original earned to shadow-banned users
  };
}

export async function processDefuseComplete(userId: number, success: boolean): Promise<{
  reward: number;
  balance: number;
}> {
  if (!success) return { reward: 0, balance: 0 };

  const redis = getRedis();
  const state = await loadUserHotState(userId);
  if (!state) return { reward: 0, balance: 0 };

  const reward = state.multiplier * GAME.DEFUSE_REWARD_MULTIPLIER;
  const newBalance = state.balance + reward;

  await redis.hmset(KEYS.userHot(userId), {
    balance: newBalance.toString(),
  });
  await redis.sadd(KEYS.dirtyUsers, userId.toString());

  return { reward, balance: newBalance };
}
