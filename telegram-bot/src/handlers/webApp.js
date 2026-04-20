import { Markup } from 'telegraf';

export const webAppHandler = (ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173';
  const isHttpsWebApp = /^https:\/\//i.test(webAppUrl);
  const appButton = isHttpsWebApp
    ? Markup.button.webApp('📱 Открыть приложение', webAppUrl)
    : Markup.button.url('ℹ Нужен HTTPS для Web App', 'https://t.me/gif_combot');
  
  return ctx.reply(
    '🌐 <b>Открыть GIFcom в Telegram</b>\n\n' +
    'Полнофункциональное веб-приложение ' +
    'прямо в Telegram для просмотра и загрузки GIF.',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          appButton
        ],
        [
          Markup.button.callback('← Назад', 'back_to_menu')
        ]
      ])
    }
  );
};