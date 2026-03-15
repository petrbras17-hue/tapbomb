import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { processTap, processDefuseComplete, loadUserHotState } from '../services/tap.service.js';
import { analyzeTapPattern } from '../services/anticheat.service.js';
import { trackSessionEnd } from '../services/analytics.service.js';
import { getRedis, KEYS } from '../plugins/redis.js';
import { GAME } from '@tapbomb/shared';
import type { WsClientMessage, WsServerMessage } from '@tapbomb/shared';

function send(ws: { send: (data: string) => void }, msg: WsServerMessage) {
  ws.send(JSON.stringify(msg));
}

export async function registerWebSocket(app: FastifyInstance) {
  app.get('/ws/tap', { websocket: true }, (socket, req) => {
    let userId: number | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let lastPong = Date.now();
    let tapCountSinceCheck = 0;

    // Auth from query param
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Missing auth token');
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: number };
      userId = decoded.userId;
    } catch {
      socket.close(4001, 'Invalid auth token');
      return;
    }

    const currentUserId = userId;

    // Track online (with error handling)
    getRedis().sadd(KEYS.online, currentUserId.toString()).catch(err =>
      console.error(`[WS] Failed to track online for user ${currentUserId}:`, err)
    );

    // Heartbeat
    heartbeatTimer = setInterval(() => {
      if (Date.now() - lastPong > GAME.WS_IDLE_TIMEOUT_MS) {
        socket.close(4002, 'Idle timeout');
        return;
      }
      send(socket, { type: 'ping' });
    }, GAME.WS_HEARTBEAT_INTERVAL_MS);

    // Anti-cheat check every 100 taps
    const maybeCheckAntiCheat = async () => {
      tapCountSinceCheck++;
      if (tapCountSinceCheck >= 100) {
        tapCountSinceCheck = 0;
        await analyzeTapPattern(currentUserId);
      }
    };

    socket.on('message', async (data: Buffer) => {
      try {
        const msg: WsClientMessage = JSON.parse(data.toString());

        switch (msg.type) {
          case 'tap': {
            const result = await processTap(currentUserId, msg.ts);
            if (result === 'defuse') {
              const state = await loadUserHotState(currentUserId);
              if (state) {
                send(socket, {
                  type: 'tap_ok',
                  balance: state.balance,
                  energy: state.energy,
                  combo: state.combo,
                  earned: state.multiplier,
                });
              }
              send(socket, { type: 'defuse_start' });
            } else {
              send(socket, result);
            }
            await maybeCheckAntiCheat();
            break;
          }

          case 'defuse_tap': {
            // Defuse taps are counted client-side
            break;
          }

          case 'defuse_complete': {
            const { success } = msg;
            const result = await processDefuseComplete(currentUserId, success);
            send(socket, {
              type: 'defuse_result',
              success,
              reward: result.reward,
              balance: result.balance,
            });
            break;
          }

          case 'pong': {
            lastPong = Date.now();
            break;
          }
        }
      } catch (err) {
        console.error('[WS] Message error:', err);
        try {
          socket.send(JSON.stringify({ type: 'error', message: 'Server error' }));
        } catch { /* socket may be closed */ }
      }
    });

    socket.on('close', () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (currentUserId) {
        trackSessionEnd(currentUserId).catch(err =>
          console.error(`[WS] Session cleanup failed for user ${currentUserId}:`, err)
        );
      }
    });

    socket.on('error', (err: Error) => {
      console.error('[WS] Socket error:', err.message);
    });

    // Send initial state sync (with error handling)
    (async () => {
      try {
        const state = await loadUserHotState(currentUserId);
        if (state) {
          send(socket, {
            type: 'state_sync',
            user: {
              id: currentUserId,
              username: null,
              firstName: 'Player',
              balance: state.balance,
              totalTaps: state.totalTaps,
              energy: state.energy,
              energyMax: state.energyMax,
              multiplier: state.multiplier,
              level: 1,
              passivePerHr: 0,
              skin: 'default',
            },
          });
        }
      } catch (err) {
        console.error(`[WS] Failed to load initial state for user ${currentUserId}:`, err);
        socket.close(4003, 'Failed to load game state');
      }
    })();
  });
}
