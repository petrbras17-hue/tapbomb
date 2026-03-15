import { GAME } from './constants';

export function isValidTapRate(tapsInLastSecond: number): boolean {
  return tapsInLastSecond <= GAME.TAP_RATE_LIMIT_PER_SEC;
}

export function calculateEnergy(
  storedEnergy: number,
  lastEnergyTs: Date,
  energyMax: number,
): number {
  const elapsedSec = (Date.now() - lastEnergyTs.getTime()) / 1000;
  const regen = Math.floor(elapsedSec * GAME.ENERGY_REGEN_PER_SEC);
  return Math.min(storedEnergy + regen, energyMax);
}

export function calculateLevel(totalTaps: number): number {
  return Math.floor(Math.sqrt(totalTaps / GAME.LEVEL_FORMULA_DIVISOR)) + 1;
}

export function calculateOfflineEarnings(
  passivePerHour: number,
  offlineMs: number,
): number {
  const hours = Math.min(offlineMs / 3600000, GAME.OFFLINE_MAX_HOURS);
  return Math.floor(passivePerHour * hours);
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatK(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}
