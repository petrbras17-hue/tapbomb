// ═══ USER ═══
export interface User {
  id: number; // Telegram user ID
  username: string | null;
  firstName: string;
  balance: number;
  totalTaps: number;
  energy: number;
  energyMax: number;
  multiplier: number;
  level: number;
  passivePerHr: number;
  skin: string;
  referredBy: number | null;
  trustScore: number;
  lastEnergyTs: Date;
  lastActive: Date;
  createdAt: Date;
}

// ═══ WEBSOCKET MESSAGES ═══
export interface WsTapMessage {
  type: 'tap';
  ts: number;
}

export interface WsTapOkMessage {
  type: 'tap_ok';
  balance: number;
  energy: number;
  combo: number;
  earned: number;
}

export interface WsTapRejectMessage {
  type: 'tap_reject';
  reason: 'no_energy' | 'rate_limit' | 'invalid';
}

export interface WsDefuseStartMessage {
  type: 'defuse_start';
}

export interface WsDefuseTapMessage {
  type: 'defuse_tap';
}

export interface WsDefuseCompleteMessage {
  type: 'defuse_complete';
  success: boolean;
}

export interface WsDefuseResultMessage {
  type: 'defuse_result';
  success: boolean;
  reward: number;
  balance: number;
}

export interface WsHeartbeatMessage {
  type: 'ping' | 'pong';
}

export interface WsStateSync {
  type: 'state_sync';
  user: UserPublic;
}

export interface WsErrorMessage {
  type: 'error';
  message: string;
}

export type WsClientMessage = WsTapMessage | WsDefuseTapMessage | WsDefuseCompleteMessage | WsHeartbeatMessage;
export type WsServerMessage = WsTapOkMessage | WsTapRejectMessage | WsDefuseStartMessage
  | WsDefuseResultMessage | WsHeartbeatMessage | WsStateSync | WsErrorMessage;

// ═══ PUBLIC USER (sent to client) ═══
export interface UserPublic {
  id: number;
  username: string | null;
  firstName: string;
  balance: number;
  totalTaps: number;
  energy: number;
  energyMax: number;
  multiplier: number;
  level: number;
  passivePerHr: number;
  skin: string;
}

// ═══ AUTH ═══
export interface AuthResponse {
  token: string;
  user: UserPublic;
}

// ═══ LEADERBOARD ═══
export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string | null;
  firstName: string;
  balance: number;
}

// ═══ ANALYTICS EVENTS ═══
export interface AnalyticsEvent {
  userId: number;
  event: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}

// ═══ TAP SESSION (for analytics) ═══
export interface TapSession {
  userId: number;
  tapCount: number;
  earned: number;
  durationMs: number;
  avgIntervalMs: number;
  startedAt: Date;
  endedAt: Date;
}
