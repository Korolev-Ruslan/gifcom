import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../db.js';
import Notification from '../models/Notification.js';

const router = express.Router();

router.post('/:gifId', authMiddleware, async (req, res) => {
  try {
    const { gifId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Comment text required' });
    }

    const result = await pool.query(
      'INSERT INTO comments (gif_id, user_id, text, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [gifId, req.user.id, text]
    );

    const gifResult = await pool.query('SELECT user_id, title FROM gifs WHERE id = $1', [gifId]);
    if (gifResult.rows[0] && gifResult.rows[0].user_id !== req.user.id) {
      const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
      await Notification.create(
        gifResult.rows[0].user_id,
        'comment',
        gifId,
        req.user.id,
        `${userResult.rows[0].username} написал комментарий к вашему GIF`
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.get('/:gifId', async (req, res) => {
  try {
    const { gifId } = req.params;
    const result = await pool.query(
      'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.gif_id = $1 ORDER BY c.created_at DESC',
      [gifId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

export default router;