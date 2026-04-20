import { Markup } from 'telegraf';

export const startHandler = (ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173';
  const isHttpsWebApp = /^https:\/\//i.test(webAppUrl);
  const siteButton = isHttpsWebApp
    ? Markup.button.webApp('🌐 Открыть сайт', webAppUrl)
    : Markup.button.url('🌐 Сайт недоступен вне HTTPS', 'https://t.me/gif_combot');
  
  return ctx.reply(
    `🎬 <b>Добро пожаловать в GIFcom Bot!</b>\n\n` +
    `Сначала нужно привязать Telegram к аккаунту GIFCOM, а потом уже загружать GIF и видео от своего имени.\n\n` +
    `<b>Как использовать:</b>\n` +
    `1️⃣ /register — создать новый аккаунт GIFCOM\n` +
    `2️⃣ /login — войти в уже существующий аккаунт сайта\n` +
    `3️⃣ После привязки просто отправьте GIF или видео\n` +
    `4️⃣ Бот загрузит файл на сайт от вашего аккаунта`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          siteButton
        ],
        [
          Markup.button.callback('🔐 Войти / зарегистрироваться', 'auth_help'),
          Markup.button.callback('📤 Как загрузить', 'upload_another'),
        ],
        [
          Markup.button.callback('📖 О боте', 'about')
        ]
      ])
    }
  );
};