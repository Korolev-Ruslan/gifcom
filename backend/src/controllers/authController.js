import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import pool from '../db.js';

const createAuthToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const createTelegramAuthToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role
});

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateUsername = (username) => /^[a-zA-Z0-9_]{3,32}$/.test(username);

const getTelegramAuthContext = (req) => {
  const botToken = req.headers['x-bot-token'] || req.body.botToken;
  const telegramUserId = req.headers['x-telegram-user-id'] || req.body.telegramUserId;
  const expectedSecret = process.env.TELEGRAM_AUTH_SECRET;

  if (!expectedSecret || !botToken || botToken !== expectedSecret) {
    return { error: { status: 401, message: 'Invalid bot token' } };
  }

  if (!telegramUserId) {
    return { error: { status: 400, message: 'Telegram user id is required' } };
  }

  return { telegramUserId: String(telegramUserId) };
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedUsername = String(username || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validateUsername(normalizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3-32 chars and contain only letters, numbers, and underscores' });
    }

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findByUsername(normalizedUsername);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = await User.create(normalizedUsername, normalizedEmail, password);
    const token = createAuthToken(user);

    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await User.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await User.verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createAuthToken(user);
    res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const telegramRegister = async (req, res) => {
  try {
    const authContext = getTelegramAuthContext(req);
    if (authContext.error) {
      return res.status(authContext.error.status).json({ error: authContext.error.message });
    }

    const { telegramUserId } = authContext;
    const { username, email, password } = req.body;
    const normalizedUsername = String(username || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validateUsername(normalizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3-32 chars and contain only letters, numbers, and underscores' });
    }

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existingTelegramUser = await pool.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [telegramUserId]
    );

    if (existingTelegramUser.rows.length > 0) {
      return res.status(409).json({ error: 'Telegram account is already linked to a GIFCOM user' });
    }

    const existingEmail = await User.findByEmail(normalizedEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findByUsername(normalizedUsername);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const createdUser = await User.create(normalizedUsername, normalizedEmail, password);
    const linkedUserResult = await pool.query(
      `UPDATE users
       SET telegram_id = $1, is_bot_user = false
       WHERE id = $2
       RETURNING id, username, email, role`,
      [telegramUserId, createdUser.id]
    );

    const user = linkedUserResult.rows[0];
    const token = createTelegramAuthToken(user);

    res.status(201).json({
      message: 'Telegram account linked successfully',
      user: sanitizeUser(user),
      token
    });
  } catch (error) {
    console.error('Telegram register error:', error);
    res.status(500).json({ error: 'Telegram registration failed' });
  }
};

export const telegramLogin = async (req, res) => {
  try {
    const authContext = getTelegramAuthContext(req);
    if (authContext.error) {
      return res.status(authContext.error.status).json({ error: authContext.error.message });
    }

    const { telegramUserId } = authContext;
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await User.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await User.verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.telegram_id && String(user.telegram_id) !== telegramUserId) {
      return res.status(409).json({ error: 'This site account is already linked to another Telegram user' });
    }

    const existingTelegramUser = await pool.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [telegramUserId]
    );

    if (existingTelegramUser.rows.length > 0 && existingTelegramUser.rows[0].id !== user.id) {
      return res.status(409).json({ error: 'This Telegram account is already linked to another GIFCOM user' });
    }

    const linkedUserResult = await pool.query(
      `UPDATE users
       SET telegram_id = $1, is_bot_user = false
       WHERE id = $2
       RETURNING id, username, email, role`,
      [telegramUserId, user.id]
    );

    const linkedUser = linkedUserResult.rows[0];
    const token = createTelegramAuthToken(linkedUser);

    res.json({
      message: 'Telegram account linked successfully',
      user: sanitizeUser(linkedUser),
      token
    });
  } catch (error) {
    console.error('Telegram login error:', error);
    res.status(500).json({ error: 'Telegram login failed' });
  }
};

export const telegramSession = async (req, res) => {
  try {
    const authContext = getTelegramAuthContext(req);
    if (authContext.error) {
      return res.status(authContext.error.status).json({ error: authContext.error.message });
    }

    const { telegramUserId } = authContext;
    const userResult = await pool.query(
      'SELECT id, username, email, role FROM users WHERE telegram_id = $1',
      [telegramUserId]
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Telegram account is not linked. Use /register or /login first.' });
    }

    const token = createTelegramAuthToken(user);
    res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    console.error('Telegram session error:', error);
    res.status(500).json({ error: 'Telegram session failed' });
  }
};