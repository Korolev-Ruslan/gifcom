import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.js';
import { uploadGif, uploadVideo, getApprovedGifs, getGifById, downloadGif, searchGifs, getUserGifs, suggestGifs } from '../controllers/gifController.js';
import { renameGifFile, getNextGifNumber } from '../utils/fileNaming.js';
import pool from '../db.js';

const router = express.Router();

const createSafeFilename = (originalname) => {
  const ext = path.extname(originalname);
  let basename = path.basename(originalname, ext);
  
  console.log('📝 Original filename:', originalname);
  
  // Не очищаем basename - Mojibake уже содержит "безопасные" символы
  // Оставляем как есть для последующего декодирования в renameGifFile
  
  if (!basename || basename.length === 0) {
    basename = Date.now().toString();
    console.log('📝 Basename was empty, using timestamp:', basename);
  } else {
    console.log('📝 Basename (Mojibake):', basename);
  }
  
  const result = basename + ext;
  console.log('📝 Temp filename:', result);
  
  return result;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isVideo = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'].includes(file.mimetype);
    const dest = isVideo ? 'uploads/temp/' : 'uploads/';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safeFilename = createSafeFilename(file.originalname);
    cb(null, safeFilename);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/gif') {
    cb(null, true);
  } else if (['video/mp4', 'video/mov', 'video/avi', 'video/webm'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only GIF and video files (MP4, MOV, AVI) are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });

router.post('/upload', authMiddleware, upload.array('gif', 10), uploadGif);

router.post('/convert', authMiddleware, upload.single('video'), uploadVideo);

router.post('/upload-bot', upload.single('gif'), async (req, res) => {
  try {
    const botToken = req.headers['x-bot-token'];
    const telegramUserId = req.headers['x-telegram-user-id'];
    const expectedBotToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || botToken !== expectedBotToken) {
      return res.status(401).json({ error: 'Invalid bot token' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    let userId;
    try {
      const userResult = await pool.query(
        'SELECT id FROM users WHERE telegram_id = $1',
        [telegramUserId]
      );

      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
      } else {
        const createResult = await pool.query(
          `INSERT INTO users (username, email, password_hash, is_bot_user, telegram_id, created_at, updated_at)
           VALUES ($1, $2, $3, true, $4, NOW(), NOW())
           RETURNING id`,
          [`bot_user_${telegramUserId}`, `bot_${telegramUserId}@gifcom.local`, '', telegramUserId]
        );
        userId = createResult.rows[0].id;
      }
    } catch (error) {
      console.error('Error managing bot user:', error);
      userId = null;
    }

    const { Gif } = await import('../models/Gif.js');
    
    const gifTitle = req.file.originalname.replace(/\.[^/.]+$/, '');
    
    try {
      const gif = await pool.query(
        `INSERT INTO gifs (user_id, filename, title, description, is_bot_upload, telegram_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
         RETURNING id, filename, title, created_at`,
        [userId, req.file.filename, gifTitle, 'Загружено через Telegram бот', telegramUserId]
      );

      const newFilename = renameGifFile(req.file.filename, gifTitle);
      
      if (newFilename) {
        await pool.query(
          'UPDATE gifs SET filename = $1, updated_at = NOW() WHERE id = $2',
          [newFilename, gif.rows[0].id]
        );
        gif.rows[0].filename = newFilename;
      }

      res.status(201).json({
        message: 'GIF uploaded successfully',
        id: gif.rows[0].id,
        filename: gif.rows[0].filename,
        title: gif.rows[0].title,
        url: `/uploads/${gif.rows[0].filename}`,
        web_url: `/gif/${gif.rows[0].id}`
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      const filePath = path.join(process.cwd(), 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.status(500).json({ error: 'Failed to save GIF' });
    }
  } catch (error) {
    console.error('Bot upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.post('/upload-guest', upload.single('gif'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { Gif } = await import('../models/Gif.js');
    
    const gifTitle = req.file.originalname.replace(/\.[^/.]+$/, '');
    
    try {
      const gif = await pool.query(
        `INSERT INTO gifs (filename, title, description, is_guest_upload, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW())
         RETURNING id, filename, title, created_at`,
        [req.file.filename, gifTitle, 'Загружено как гость']
      );

      const newFilename = renameGifFile(req.file.filename, gifTitle);
      
      if (newFilename) {
        await pool.query(
          'UPDATE gifs SET filename = $1, updated_at = NOW() WHERE id = $2',
          [newFilename, gif.rows[0].id]
        );
        gif.rows[0].filename = newFilename;
      }

      res.status(201).json({
        message: 'GIF uploaded successfully',
        id: gif.rows[0].id,
        filename: gif.rows[0].filename,
        title: gif.rows[0].title,
        url: `/uploads/${gif.rows[0].filename}`,
        web_url: `/gif/${gif.rows[0].id}`
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      const filePath = path.join(process.cwd(), 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.status(500).json({ error: 'Failed to save GIF' });
    }
  } catch (error) {
    console.error('Guest upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM gifs WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0]?.count || 0) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get count' });
  }
});

router.get('/suggest', suggestGifs);
router.get('/search', searchGifs);
router.get('/channel/:username', getUserGifs);
router.get('/approved', getApprovedGifs);
router.get('/:id', getGifById);
router.get('/:id/download', downloadGif);

export default router;