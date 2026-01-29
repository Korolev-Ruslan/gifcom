import { Markup } from 'telegraf';

export const startHandler = (ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173/web-app';
  
  return ctx.reply(
    `🎬 <b>Добро пожаловать в GIFcom Bot!</b>\n\n` +
    `Загружайте, просматривайте и делитесь GIF-файлами прямо из Telegram.\n\n` +
    `<b>Как использовать:</b>\n` +
    `1️⃣ Отправьте GIF-файл боту\n` +
    `2️⃣ Бот загрузит его на сайт\n` +
    `3️⃣ Получите ссылку для просмотра\n` +
    `4️⃣ Поделитесь с друзьями!`,
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          '🌐 Открыть сайт',
          webAppUrl
        )
      ],
      [
        Markup.button.url(
          '❓ Справка',
          'https://t.me/gifcom_bot/help'
        ),
        Markup.button.callback(
          '📖 О боте',
          'about'
        )
      ]
    ]),
    { parse_mode: 'HTML' }
  );
};