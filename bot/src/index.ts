import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const WEBAPP_URL = process.env.WEBAPP_URL || 'https://tapbomb.io';

const bot = new Bot(token);

// ═══ /start command ═══
bot.command('start', async (ctx) => {
  const startParam = ctx.match; // ref_{userId} or empty
  const firstName = ctx.from?.first_name || 'Player';

  const keyboard = new InlineKeyboard()
    .webApp('🎮 Play TAPBOMB', WEBAPP_URL + (startParam ? `?startapp=${startParam}` : ''));

  await ctx.reply(
    `Hey ${firstName}! 💣\n\n` +
    `Welcome to *TAPBOMB* — the CS2 Tap-to-Earn game!\n\n` +
    `🔥 Tap the C4 bomb to earn $BOMB\n` +
    `⚡ Defuse bombs for bonus rewards\n` +
    `🏆 Compete on the leaderboard\n` +
    `👥 Invite friends for 10% commission\n\n` +
    `Tap the button below to start playing!`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  );
});

// ═══ /referral command ═══
bot.command('referral', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const refLink = `https://t.me/tap_bomb_bot?start=ref_${userId}`;

  const keyboard = new InlineKeyboard()
    .url('📤 Share with Friends', `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('🎮 Play TAPBOMB and earn $BOMB! 💣')}`);

  await ctx.reply(
    `🔗 *Your Referral Link:*\n\n` +
    `\`${refLink}\`\n\n` +
    `Share this link with friends and earn *10% commission* on all their taps!\n\n` +
    `The more friends you invite, the more you earn! 🚀`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  );
});

// ═══ /stats command ═══
bot.command('stats', async (ctx) => {
  await ctx.reply(
    `📊 *Your Stats*\n\n` +
    `Open the game to see your full statistics, leaderboard position, and referral earnings.`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().webApp('📊 View Stats', WEBAPP_URL),
    },
  );
});

// ═══ /help command ═══
bot.command('help', async (ctx) => {
  await ctx.reply(
    `💣 *TAPBOMB Help*\n\n` +
    `*Commands:*\n` +
    `/start — Open the game\n` +
    `/referral — Get your referral link\n` +
    `/stats — View your statistics\n` +
    `/help — Show this message\n\n` +
    `*How to play:*\n` +
    `1. Tap the C4 bomb to earn $BOMB\n` +
    `2. Every 100 taps triggers a Defuse minigame\n` +
    `3. Buy boosts and skins in the Shop\n` +
    `4. Invite friends for passive income\n` +
    `5. Climb the leaderboard!`,
    { parse_mode: 'Markdown' },
  );
});

// ═══ Handle inline share ═══
bot.on('inline_query', async (ctx) => {
  const userId = ctx.from?.id;
  const refLink = `https://t.me/tap_bomb_bot?start=ref_${userId}`;

  await ctx.answerInlineQuery([{
    type: 'article',
    id: 'share',
    title: '🎮 Share TAPBOMB',
    description: 'Invite friends to play TAPBOMB!',
    input_message_content: {
      message_text: `🎮 *TAPBOMB — CS2 Tap-to-Earn!*\n\n💣 Tap the bomb, earn $BOMB, climb the leaderboard!\n\n👉 [Play Now](${refLink})`,
      parse_mode: 'Markdown',
    },
  }]);
});

// ═══ START BOT ═══
bot.start({
  onStart: (botInfo) => {
    console.log(`[Bot] @${botInfo.username} started successfully`);
  },
});

console.log('[Bot] Starting TAPBOMB bot...');
