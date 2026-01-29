import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/check-hash', authMiddleware, async (req, res) => {
  try {
    const { hashes } = req.body;

    if (!hashes || !Array.isArray(hashes) || hashes.length === 0) {
      return res.status(400).json({ error: 'No hashes provided' });
    }
    
    const results = [];
    for (const hash of hashes) {
      const result = await pool.query(
        'SELECT id, filename, title, user_id FROM gifs WHERE file_hash = $1',
        [hash]
      );

      if (result.rows.length > 0) {
        results.push({
          hash,
          exists: true,
          gif: result.rows[0]
        });
      } else {
        results.push({
          hash,
          exists: false
        });
      }
    }

    const duplicates = results.filter(r => r.exists);
    
    res.json({
      results,
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.map(d => ({
        id: d.gif.id,
        title: d.gif.title,
        filename: d.gif.filename
      }))
    });
  } catch (error) {
    console.error('Error checking hashes:', error);
    res.status(500).json({ error: 'Failed to check hashes' });
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

export default router;