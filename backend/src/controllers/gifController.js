import { Gif } from '../models/Gif.js';
import { User } from '../models/User.js';
import path from 'path';
import fs from 'fs';
import { convertVideoToGif, getVideoMetadata, cleanupTempFile, compressGif } from '../utils/converter.js';
import { renameGifFile } from '../utils/fileNaming.js';
import pool from '../db.js';

export const uploadGif = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { title, description, tags, fileHashes } = req.body;
    const tagList = tags ? (typeof tags === 'string' ? tags.split(',') : tags) : [];
    
    let hashesMap = {};
    if (fileHashes) {
      try {
        hashesMap = typeof fileHashes === 'string' ? JSON.parse(fileHashes) : fileHashes;
      } catch (e) {
        console.warn('Failed to parse fileHashes:', e);
      }
    }

    const uploadedGifs = [];
    const errors = [];

    for (const file of req.files) {
      let fileHash = hashesMap[file.filename] || hashesMap[file.originalname];
      
      if (!fileHash) {
        const filePath = path.join(process.cwd(), 'uploads', file.filename);
        fileHash = await computeServerHash(filePath);
      }

      const existingGif = await Gif.findByHashAndUser(fileHash, req.user.id);
      if (existingGif) {
        errors.push({
          filename: file.originalname,
          error: 'Этот файл уже был загружен вами ранее'
        });
        const filePath = path.join(process.cwd(), 'uploads', file.filename);
        fs.unlinkSync(filePath);
        continue;
      }

      const gifTitle = (title && req.files.length === 1) ? title : file.originalname.replace(/\.[^/.]+$/, '');
      const gifDescription = description || '';
      const gifTags = (tags && req.files.length === 1) ? tagList : [];
      
      const filePath = path.join(process.cwd(), 'uploads', file.filename);
      if (file.originalname.toLowerCase().endsWith('.gif')) {
        try {
          console.log('🎬 Compressing GIF file:', file.originalname);
          await compressGif(filePath);
          console.log('✅ GIF compressed successfully');
          fileHash = await computeServerHash(filePath);
        } catch (err) {
          console.warn('⚠️ GIF compression failed, continuing:', err.message);
        }
      }
      
      const gif = await Gif.create(
        req.user.id,
        file.filename,
        gifTitle,
        gifDescription,
        gifTags,
        fileHash
      );

      const newFilename = renameGifFile(file.filename, gifTitle);
      
      if (newFilename) {
        await Gif.updateFilename(gif.id, newFilename);
        gif.filename = newFilename;
      }

      uploadedGifs.push(gif);
    }

    if (uploadedGifs.length === 0) {
      return res.status(400).json({ 
        error: 'Все файлы уже существуют',
        errors 
      });
    }

    res.status(201).json({ 
      message: uploadedGifs.length === 1 ? 'GIF загружен' : `${uploadedGifs.length} GIF загружено`,
      gifs: uploadedGifs,
      errors: errors.length > 0 ? errors : undefined,
      skipped: errors.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
};

async function computeServerHash(filePath) {
  const crypto = await import('crypto');
  const fs = await import('fs');
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

export const uploadVideo = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { title, description, tags, fps, width, startTime, duration } = req.body;
    const videoPath = req.file.path;
    const tagList = tags ? (typeof tags === 'string' ? tags.split(',') : tags) : [];

    const baseFilename = `${Date.now()}_${req.file.originalname.replace(/\.[^/.]+$/, '')}`;
    
    const conversionOptions = {
      fps: fps ? parseInt(fps) : 10,
      width: width ? parseInt(width) : 480,
      startTime: startTime ? parseFloat(startTime) : 0,
      duration: duration ? parseFloat(duration) : null
    };

    console.log('Starting video conversion...');
    
    try {
      const gifPath = await convertVideoToGif(videoPath, baseFilename, conversionOptions);

      console.log('Starting GIF compression...');
      await compressGif(gifPath);
      console.log('✅ GIF compressed successfully');

      let metadata = {};
      try {
        metadata = await getVideoMetadata(videoPath);
      } catch (metaError) {
        console.warn('Could not get video metadata:', metaError);
      }

      cleanupTempFile(videoPath);

      const fileHash = await computeServerHash(gifPath);

      const existingGif = await Gif.findByHash(fileHash);
      if (existingGif) {
        fs.unlinkSync(gifPath);
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'Этот GIF уже существует на сайте',
          existingGif: {
            id: existingGif.id,
            title: existingGif.title
          }
        });
      }

      const gifTitle = title || req.file.originalname.replace(/\.[^/.]+$/, '');
      const gifDescription = description || '';
      const gifTags = tagList;

      const gif = await Gif.create(
        req.user.id,
        path.basename(gifPath),
        gifTitle,
        gifDescription,
        gifTags,
        fileHash
      );

      const newFilename = renameGifFile(path.basename(gifPath), gifTitle);
      
      if (newFilename) {
        await Gif.updateFilename(gif.id, newFilename);
        gif.filename = newFilename;
      }

      res.status(201).json({
        message: 'Видео успешно конвертировано в GIF',
        gif,
        metadata: {
          originalDuration: metadata.duration,
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          conversionOptions: conversionOptions
        }
      });

    } catch (conversionError) {
      cleanupTempFile(videoPath);
      throw conversionError;
    }

  } catch (error) {
    console.error('Video conversion error:', error);
    res.status(500).json({ 
      error: 'Video conversion failed',
      message: error.message 
    });
  }
};


export const getApprovedGifs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit
    const excludeIds = req.query.exclude_ids ? req.query.exclude_ids.split(',').map(id => parseInt(id)).filter(Boolean) : []

    const gifs = await Gif.findAll(true, limit, offset, excludeIds)
    res.json({ gifs, page, limit })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch gifs' });
  }
};

export const getGifById = async (req, res) => {
  try {
    const gif = await Gif.findById(req.params.id);
    if (!gif) {
      return res.status(404).json({ error: 'GIF not found' });
    }
    res.json(gif);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch gif' });
  }
};

export const downloadGif = async (req, res) => {
  try {
    const gif = await Gif.findById(req.params.id);
    if (!gif) {
      return res.status(404).json({ error: 'GIF not found' });
    }

    const filePath = path.join(process.cwd(), 'uploads', gif.filename);
    res.download(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Download failed' });
  }
};

export const searchGifs = async (req, res) => {
  try {
    const { q, tag } = req.query;

    let gifs = [];
    if (tag) {
      gifs = await Gif.searchByTag(tag);
    } else if (q) {
      gifs = await Gif.searchByTitle(q);
    } else {
      gifs = await Gif.findAll(true);
    }

    res.json(gifs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search failed' });
  }
};

export const suggestGifs = async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json({ suggestions: [] })

    const like = `%${q}%`
    const titles = await Gif.searchByTitle(q)
    const titleSuggestions = (titles || []).slice(0, 6).map(g => ({ type: 'title', value: g.title }))

    const tagResult = await Gif.searchByTag(q)
    const tagSet = new Set()
    (tagResult || []).forEach(g => {
      (g.tags || []).forEach(t => {
        if (t && t.toLowerCase().includes(q.toLowerCase())) tagSet.add(t)
      })
    })
    const tagSuggestions = Array.from(tagSet).slice(0, 6).map(t => ({ type: 'tag', value: t }))

    const merged = [...titleSuggestions]
    tagSuggestions.forEach(ts => {
      if (!merged.find(m => m.value === ts.value)) merged.push(ts)
    })

    res.json({ suggestions: merged })
  } catch (error) {
    console.error('Error in suggestGifs:', error)
    res.status(500).json({ error: 'Suggest failed' })
  }
}

export const getUserGifs = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const gifs = await Gif.findByUserId(user.id);
    const profile = await User.getPublicProfile(user.id);

    res.json({ profile, gifs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user gifs' });
  }
};