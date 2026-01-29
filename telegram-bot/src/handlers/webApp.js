import { Markup } from 'telegraf';

export const webAppHandler = (ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173/web-app';
  
  return ctx.reply(
    '🌐 <b>Открыть GIFcom в Telegram</b>\n\n' +
    'Полнофункциональное веб-приложение ' +
    'прямо в Telegram для просмотра и загрузки GIF.',
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          '📱 Открыть приложение',
          webAppUrl
        )
      ],
      [
        Markup.button.callback(
          '← Назад',
          'back_to_menu'
        )
      ]
    ]),
    { parse_mode: 'HTML' }
  );
};