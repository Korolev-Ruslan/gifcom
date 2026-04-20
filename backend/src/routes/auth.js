import express from 'express';
import {
  register,
  login,
  telegramRegister,
  telegramLogin,
  telegramSession
} from '../controllers/authController.js';
import { createRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();
const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `${req.ip}:auth:${req.path}`,
  message: 'Too many authentication attempts. Try again later.'
});
const telegramAuthRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyFn: (req) => {
    const telegramUserId = req.headers['x-telegram-user-id'] || req.body.telegramUserId || 'unknown';
    return `${req.ip}:tg:${telegramUserId}:${req.path}`;
  },
  message: 'Too many Telegram auth attempts. Try again later.'
});

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/telegram/register', telegramAuthRateLimit, telegramRegister);
router.post('/telegram/login', telegramAuthRateLimit, telegramLogin);
router.post('/telegram/session', telegramAuthRateLimit, telegramSession);

export default router;