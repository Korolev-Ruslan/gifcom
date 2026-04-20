import axios from 'axios';
import { Markup } from 'telegraf';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/api';

const authStates = new Map();
const authStateTimers = new Map();
const AUTH_STATE_TTL_MS = 10 * 60 * 1000;

const buildBotHeaders = (telegramUserId) => ({
  'X-Bot-Token': process.env.TELEGRAM_AUTH_SECRET,
  'X-Telegram-User-Id': telegramUserId.toString()
});

const normalizeEmail = (value) => value.trim().toLowerCase();

const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getState = (telegramUserId) => authStates.get(telegramUserId);

const clearState = (telegramUserId) => {
  authStates.delete(telegramUserId);

  const timer = authStateTimers.get(telegramUserId);
  if (timer) {
    clearTimeout(timer);
    authStateTimers.delete(telegramUserId);
  }
};

const setState = (telegramUserId, state) => {
  clearState(telegramUserId);
  authStates.set(telegramUserId, state);

  const timer = setTimeout(() => {
    clearState(telegramUserId);
  }, AUTH_STATE_TTL_MS);

  authStateTimers.set(telegramUserId, timer);
};

export const getLinkedUserToken = async (telegramUserId) => {
  const response = await axios.post(
    `${BACKEND_URL}/auth/telegram/session`,
    {},
    {
      headers: buildBotHeaders(telegramUserId)
    }
  );

  return response.data.token;
};

export const beginRegister = async (ctx) => {
  setState(ctx.from.id, {
    mode: 'register',
    step: 'username',
    data: {}
  });

  return ctx.reply(
    'Начинаем регистрацию в GIFCOM.\n\nШаг 1 из 3: отправь желаемый username.',
    Markup.inlineKeyboard([[Markup.button.callback('Отмена', 'cancel_auth')]])
  );
};

export const beginLogin = async (ctx) => {
  setState(ctx.from.id, {
    mode: 'login',
    step: 'email',
    data: {}
  });

  return ctx.reply(
    'Входим в существующий аккаунт GIFCOM.\n\nШаг 1 из 2: отправь email от аккаунта на сайте.',
    Markup.inlineKeyboard([[Markup.button.callback('Отмена', 'cancel_auth')]])
  );
};

export const cancelAuth = async (ctx) => {
  clearState(ctx.from.id);
  return ctx.reply('Ок, остановил авторизацию. Когда будешь готов — используй /login или /register.');
};

const finishAuth = async (ctx, endpoint, payload, successText) => {
  const response = await axios.post(
    `${BACKEND_URL}${endpoint}`,
    payload,
    {
      headers: buildBotHeaders(ctx.from.id)
    }
  );

  clearState(ctx.from.id);

  return ctx.reply(
    `${successText}\n\nТеперь можешь просто отправить GIF или видео, и я загружу файл от твоего аккаунта.`,
    Markup.inlineKeyboard([
      [Markup.button.callback('Как загрузить файл', 'upload_another')]
    ])
  );
};

const handleRegisterStep = async (ctx, state, text) => {
  if (state.step === 'username') {
    if (text.length < 3) {
      return ctx.reply('Username слишком короткий. Нужны минимум 3 символа.');
    }

    state.data.username = text.trim();
    state.step = 'email';
    setState(ctx.from.id, state);
    return ctx.reply('Шаг 2 из 3: теперь отправь email.');
  }

  if (state.step === 'email') {
    const email = normalizeEmail(text);
    if (!validateEmail(email)) {
      return ctx.reply('Похоже, это не email. Попробуй еще раз.');
    }

    state.data.email = email;
    state.step = 'password';
    setState(ctx.from.id, state);
    return ctx.reply('Шаг 3 из 3: отправь пароль для нового аккаунта.');
  }

  if (state.step === 'password') {
    if (text.length < 8) {
      return ctx.reply('Пароль слишком короткий. Нужны минимум 8 символов.');
    }

    state.data.password = text;
    return finishAuth(
      ctx,
      '/auth/telegram/register',
      state.data,
      '✅ Аккаунт создан и привязан к Telegram.'
    );
  }
};

const handleLoginStep = async (ctx, state, text) => {
  if (state.step === 'email') {
    const email = normalizeEmail(text);
    if (!validateEmail(email)) {
      return ctx.reply('Похоже, это не email. Попробуй еще раз.');
    }

    state.data.email = email;
    state.step = 'password';
    setState(ctx.from.id, state);
    return ctx.reply('Шаг 2 из 2: отправь пароль от аккаунта на сайте.');
  }

  if (state.step === 'password') {
    state.data.password = text;
    return finishAuth(
      ctx,
      '/auth/telegram/login',
      state.data,
      '✅ Аккаунт найден и привязан к Telegram.'
    );
  }
};

export const handleAuthText = async (ctx) => {
  const state = getState(ctx.from.id);
  if (!state || !ctx.message?.text) {
    return false;
  }

  const text = ctx.message.text.trim();
  if (!text || text.startsWith('/')) {
    return false;
  }

  try {
    if (state.mode === 'register') {
      await handleRegisterStep(ctx, state, text);
      return true;
    }

    if (state.mode === 'login') {
      await handleLoginStep(ctx, state, text);
      return true;
    }
  } catch (error) {
    const message = error.response?.data?.error || 'Не удалось завершить авторизацию. Попробуй еще раз.';
    clearState(ctx.from.id);
    await ctx.reply(`❌ ${message}`);
    return true;
  }

  return false;
};