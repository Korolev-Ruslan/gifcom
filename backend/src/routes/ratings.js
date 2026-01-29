import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../db.js';

const router = express.Router();

const REACTIONS = ['😀', '😍', '🤣', '😢', '😡'];

router.post('/:gifId', authMiddleware, async (req, res) => {
  try {
    const { gifId } = req.params;
    const { reaction } = req.body;

    if (!REACTIONS.includes(reaction)) {
      return res.status(400).json({ error: 'Invalid reaction emoji' });
    }

    const existing = await pool.query(
      'SELECT * FROM ratings WHERE gif_id = $1 AND user_id = $2',
      [gifId, req.user.id]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE ratings SET reaction = $1 WHERE gif_id = $2 AND user_id = $3 RETURNING *',
        [reaction, gifId, req.user.id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO ratings (gif_id, user_id, reaction) VALUES ($1, $2, $3) RETURNING *',
        [gifId, req.user.id, reaction]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save reaction' });
  }
});

router.get('/:gifId', async (req, res) => {
  try {
    const { gifId } = req.params;
    const result = await pool.query(
      `SELECT reaction, COUNT(*) as count 
       FROM ratings 
       WHERE gif_id = $1 
       GROUP BY reaction`,
      [gifId]
    );
    
    const reactions = {};
    REACTIONS.forEach(r => reactions[r] = 0);
    result.rows.forEach(row => {
      reactions[row.reaction] = parseInt(row.count);
    });

    res.json(reactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

router.get('/:gifId/user-reaction', authMiddleware, async (req, res) => {
  try {
    const { gifId } = req.params;
    const result = await pool.query(
      'SELECT reaction FROM ratings WHERE gif_id = $1 AND user_id = $2',
      [gifId, req.user.id]
    );

    if (result.rows.length > 0) {
      res.json({ reaction: result.rows[0].reaction });
    } else {
      res.json({ reaction: null });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user reaction' });
  }
});

export default router;