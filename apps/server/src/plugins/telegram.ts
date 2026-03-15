import crypto from 'node:crypto';
import { config } from '../config.js';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface ParsedInitData {
  user: TelegramUser;
  authDate: number;
  hash: string;
  startParam?: string;
}

export function validateTelegramInitData(initData: string): ParsedInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Build data-check-string (sorted alphabetically, excluding hash)
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // Validate HMAC
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.telegramBotToken)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) return null;

    // Check auth_date is not too old (allow 24 hours)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return null;

    // Parse user
    const userStr = params.get('user');
    if (!userStr) return null;
    const user: TelegramUser = JSON.parse(userStr);

    return {
      user,
      authDate,
      hash,
      startParam: params.get('start_param') || undefined,
    };
  } catch {
    return null;
  }
}
