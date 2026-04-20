import { Telegraf, Markup } from 'telegraf';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { startHandler } from './handlers/start.js';
import { gifUploadHandler } from './handlers/gifUpload.js';
import { webAppHandler } from './handlers/webApp.js';
import { beginLogin, beginRegister, cancelAuth, handleAuthText } from './handlers/auth.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен в .env файле');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.use((ctx, next) => {
  const descriptor = ctx.message?.text?.startsWith('/')
    ? ctx.message.text.split(' ')[0]
    : ctx.updateType;
  console.log(`👤 ${ctx.from.first_name} (${ctx.from.id}): ${descriptor}`);
  return next();
});

bot.command('start', startHandler);
bot.command('register', beginRegister);
bot.command('login', beginLogin);
bot.command('cancel', cancelAuth);
bot.command('help', (ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173';
  const isHttpsWebApp = /^https:\/\//i.test(webAppUrl);
  const helpButton = isHttpsWebApp
    ? Markup.button.webApp('🌐 Открыть сайт', webAppUrl)
    : Markup.button.url('ℹ Сайт появится после публичного деплоя', 'https://t.me/gif_combot');

  return ctx.reply(
    `🎬 <b>Добро пожаловать в GIFcom Bot!</b>\n\n` +
    `Доступные команды:\n` +
    `/start - Главное меню\n` +
    `/register - Создать новый аккаунт GIFCOM\n` +
    `/login - Войти в существующий аккаунт GIFCOM\n` +
    `/cancel - Отменить текущую авторизацию\n` +
    `/help - Справка\n\n` +
    `<b>Возможности:</b>\n` +
    `🔐 Сначала привяжите Telegram к аккаунту GIFCOM\n` +
    `📤 Потом отправьте GIF или видео - файл загрузится на сайт от вашего имени\n` +
    `🌐 Откройте веб-приложение - просмотр и отправка GIF\n` +
    `💬 Делитесь GIF с друзьями - прямо из чата`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [helpButton],
      ])
    }
  );
});

bot.on('document', gifUploadHandler);
bot.on('animation', gifUploadHandler);

bot.action('open_webapp', webAppHandler);
bot.action('auth_help', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.reply(
    'Для загрузки от своего имени нужно сначала привязать аккаунт.\n\n' +
    '/register — если аккаунта GIFCOM еще нет\n' +
    '/login — если аккаунт на сайте уже есть\n' +
    '/cancel — если хочешь прервать ввод'
  );
});
bot.action('cancel_auth', async (ctx) => {
  await ctx.answerCbQuery();
  return cancelAuth(ctx);
});
bot.action('back_to_menu', async (ctx) => {
  await ctx.answerCbQuery();
  return startHandler(ctx);
});
bot.action('upload_another', (ctx) => {
  ctx.answerCbQuery();
  return ctx.reply(
    'Отправьте GIF или видеофайл сюда, и я загружу его на сайт. Можно просто перетащить файл в чат.'
  );
});
bot.action('about', (ctx) => {
  ctx.answerCbQuery();
  return ctx.reply(
    'Бот сначала привязывает Telegram к твоему аккаунту GIFCOM, а потом принимает GIF и видео и загружает их на сайт от твоего имени.'
  );
});

bot.on('web_app_data', (ctx) => {
  console.log('📱 Web App Data:', ctx.webAppData.data);
  ctx.reply('✅ Спасибо за использование Web App!');
});

bot.hears(/^(📱\s*вебсайт|веб|web|сайт)$/i, startHandler);
bot.on('text', async (ctx, next) => {
  const wasHandled = await handleAuthText(ctx);
  if (!wasHandled) {
    return next();
  }
});

bot.catch((err, ctx) => {
  console.error('❌ Ошибка:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
});

bot.launch().then(() => {
  console.log('🚀 Telegram бот запущен!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));