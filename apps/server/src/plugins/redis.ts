import Redis from 'ioredis';
import { config } from '../config.js';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err) => console.error('[Redis] Error:', err.message));
    redis.on('connect', () => console.log('[Redis] Connected'));
  }
  return redis;
}

// ═══ REDIS KEY HELPERS ═══
export const KEYS = {
  userHot: (id: number) => `tapbomb:user:${id}:hot`,
  dirtyUsers: 'tapbomb:dirty_users',
  tapRate: (id: number, sec: number) => `tapbomb:taps:${id}:${sec}`,
  combo: (id: number) => `tapbomb:combo:${id}`,
  leaderboard: 'tapbomb:leaderboard:alltime',
  sessionTaps: (id: number) => `tapbomb:session:${id}:taps`,
  online: 'tapbomb:online',
} as const;
