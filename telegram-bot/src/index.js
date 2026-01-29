import { Telegraf, Markup } from 'telegraf';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { startHandler } from './handlers/start.js';
import { gifUploadHandler } from './handlers/gifUpload.js';
import { webAppHandler } from './handlers/webApp.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен в .env файле');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.use((ctx, next) => {
  console.log(`👤 ${ctx.from.first_name} (${ctx.from.id}): ${ctx.message?.text || ctx.updateType}`);
  return next();
});

bot.command('start', startHandler);
bot.command('help', (ctx) => {
  return ctx.reply(
    `🎬 <b>Добро пожаловать в GIFcom Bot!</b>\n\n` +
    `Доступные команды:\n` +
    `/start - Главное меню\n` +
    `/help - Справка\n\n` +
    `<b>Возможности:</b>\n` +
    `📤 Отправьте GIF - загрузится на сайт\n` +
    `🌐 Откройте веб-приложение - просмотр и отправка GIF\n` +
    `💬 Делитесь GIF с друзьями - прямо из чата`,
    { parse_mode: 'HTML' }
  );
});

bot.on('document', gifUploadHandler);
bot.on('animation', gifUploadHandler);

bot.action('open_webapp', webAppHandler);

bot.on('web_app_data', (ctx) => {
  console.log('📱 Web App Data:', ctx.webAppData.data);
  ctx.reply('✅ Спасибо за использование Web App!');
});

bot.hears(/^(📱\s*вебсайт|веб|web|сайт)$/i, startHandler);

bot.catch((err, ctx) => {
  console.error('❌ Ошибка:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
});

bot.launch().then(() => {
  console.log('🚀 Telegram бот запущен!');
  console.log(`📍 Bot token: ${BOT_TOKEN.substring(0, 10)}...`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));