import { getDb } from '../plugins/db.js';
import { analyticsEvents, tapSessions } from '../db/schema.js';
import { getRedis, KEYS } from '../plugins/redis.js';

// ═══ Track any user event ═══
export async function trackEvent(
  userId: number,
  event: string,
  properties?: Record<string, unknown>,
  screen?: string,
  sessionId?: string,
  deviceInfo?: string,
): Promise<void> {
  try {
    const db = getDb();
    await db.insert(analyticsEvents).values({
      userId,
      event,
      screen: screen || null,
      properties: properties ? JSON.stringify(properties) : null,
      sessionId: sessionId || null,
      deviceInfo: deviceInfo || null,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[Analytics] Failed to track event:', err);
  }
}

// ═══ Flush tap session data from Redis to PostgreSQL ═══
export async function flushTapSession(userId: number): Promise<void> {
  const redis = getRedis();
  const taps = await redis.lrange(KEYS.sessionTaps(userId), 0, -1);
  if (taps.length < 2) return;

  const entries = taps.map(t => {
    const [ts, earned] = t.split(':');
    return { ts: parseInt(ts, 10), earned: parseInt(earned, 10) };
  });

  const startedAt = new Date(entries[0].ts);
  const endedAt = new Date(entries[entries.length - 1].ts);
  const durationMs = entries[entries.length - 1].ts - entries[0].ts;
  const totalEarned = entries.reduce((sum, e) => sum + e.earned, 0);

  // Calculate average tap interval
  let avgIntervalMs = 0;
  if (entries.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < entries.length; i++) {
      intervals.push(entries[i].ts - entries[i - 1].ts);
    }
    avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  try {
    const db = getDb();
    await db.insert(tapSessions).values({
      userId,
      tapCount: entries.length,
      earned: totalEarned,
      durationMs,
      avgIntervalMs,
      startedAt,
      endedAt,
    });

    // Clear processed taps
    await redis.del(KEYS.sessionTaps(userId));
  } catch (err) {
    console.error('[Analytics] Failed to flush tap session:', err);
  }
}

// ═══ Track screen navigation ═══
export async function trackScreenView(userId: number, screen: string, sessionId?: string): Promise<void> {
  await trackEvent(userId, 'screen_view', { screen }, screen, sessionId);
}

// ═══ Track purchase ═══
export async function trackPurchase(userId: number, itemKey: string, price: number): Promise<void> {
  await trackEvent(userId, 'purchase', { itemKey, price }, 'shop');
}

// ═══ Track session start/end ═══
export async function trackSessionStart(userId: number, deviceInfo?: string): Promise<void> {
  await trackEvent(userId, 'session_start', {}, undefined, undefined, deviceInfo);
  await getRedis().sadd(KEYS.online, userId.toString());
}

export async function trackSessionEnd(userId: number): Promise<void> {
  await trackEvent(userId, 'session_end');
  await getRedis().srem(KEYS.online, userId.toString());
  await flushTapSession(userId);
}
