import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://tapbomb:tapbomb@localhost:5432/tapbomb',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  hmacSecret: process.env.HMAC_SECRET || 'change-me-in-production',

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],

  // Google Cloud
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  gcpKeyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
} as const;

// Fail fast in production if critical secrets are missing
if (isProd) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required in production');
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN environment variable is required in production');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL environment variable is required in production');
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL environment variable is required in production');
}
