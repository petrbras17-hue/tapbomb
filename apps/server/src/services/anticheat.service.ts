import { GAME } from '@tapbomb/shared';
import { getRedis, KEYS } from '../plugins/redis.js';

interface TapAnalysis {
  isSuspicious: boolean;
  reasons: string[];
  newTrustScore: number;
}

export async function analyzeTapPattern(userId: number): Promise<TapAnalysis> {
  const redis = getRedis();
  const reasons: string[] = [];

  // Get recent tap timestamps from session
  const taps = await redis.lrange(KEYS.sessionTaps(userId), -100, -1);
  if (taps.length < 20) {
    return { isSuspicious: false, reasons: [], newTrustScore: 1.0 };
  }

  const timestamps = taps.map(t => parseInt(t.split(':')[0], 10));

  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push(timestamps[i] - timestamps[i - 1]);
  }

  // Check 1: Standard deviation too low (bot-like uniformity)
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const stddev = Math.sqrt(variance);

  if (stddev < GAME.ANTICHEAT_STDDEV_THRESHOLD) {
    reasons.push(`tap_interval_stddev_too_low:${stddev.toFixed(2)}`);
  }

  // Check 2: Sustained high TPM
  const windowMs = timestamps[timestamps.length - 1] - timestamps[0];
  const tpm = (timestamps.length / (windowMs / 60000));
  if (tpm > GAME.ANTICHEAT_MAX_SUSTAINED_TPM) {
    reasons.push(`sustained_tpm_too_high:${tpm.toFixed(0)}`);
  }

  // Check 3: Perfectly regular spacing (identical intervals)
  const uniqueIntervals = new Set(intervals.map(i => Math.round(i / 5) * 5)); // round to 5ms
  if (uniqueIntervals.size <= 2 && intervals.length > 30) {
    reasons.push('perfectly_regular_intervals');
  }

  // Calculate trust score adjustment
  const isSuspicious = reasons.length > 0;
  const currentScore = parseFloat(
    (await redis.hget(KEYS.userHot(userId), 'trustScore')) || '1.0'
  );

  let newTrustScore = currentScore;
  if (isSuspicious) {
    newTrustScore = Math.max(0, currentScore - 0.1 * reasons.length);
    await redis.hset(KEYS.userHot(userId), 'trustScore', newTrustScore.toString());
    await redis.sadd(KEYS.dirtyUsers, userId.toString());
  }

  return { isSuspicious, reasons, newTrustScore };
}
