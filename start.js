// Smart entrypoint: run bot or web server based on SERVICE_TYPE env var
const serviceType = process.env.SERVICE_TYPE || 'web';

if (serviceType === 'bot') {
  console.log('[Start] Launching Telegram bot...');
  import('./bot/dist/index.js');
} else {
  console.log('[Start] Launching web server...');
  import('./apps/server/dist/index.js');
}
