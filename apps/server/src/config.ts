import 'dotenv/config';

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

  // Google Cloud
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  gcpKeyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
} as const;
