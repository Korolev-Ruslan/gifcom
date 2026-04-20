import express from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middleware/auth.js';
import { uploadGif, uploadVideo, getApprovedGifs, getGifById, downloadGif, searchGifs, getUserGifs, suggestGifs } from '../controllers/gifController.js';
import pool from '../db.js';

const router = express.Router();

const createSafeFilename = (originalname) => {
  const ext = path.extname(originalname);
  let basename = path.basename(originalname, ext);
  
  console.log('📝 Original filename:', originalname);
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