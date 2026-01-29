import pool from '../db.js';
import { Gif } from '../models/Gif.js';
import Notification from '../models/Notification.js';
import fs from 'fs';
import path from 'path';

export const getPendingGifs = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT g.*, u.username FROM gifs g JOIN users u ON g.user_id = u.id WHERE g.status = $1 ORDER BY g.created_at DESC',
      ['pending']
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending gifs' });
  }
};

export const approveGif = async (req, res) => {
  try {
    const { id } = req.params;
    const gif = await Gif.updateStatus(id, 'approved');
    
    const gifData = await pool.query('SELECT * FROM gifs WHERE id = $1', [id]);
    if (gifData.rows[0]) {
      await Notification.create(
        gifData.rows[0].user_id,
        'gif_approved',
        id,
        null,
        `Ваш GIF "${gifData.rows[0].title}" одобрен! 🎉`
      );
    }
    
    res.json(gif);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve gif' });
  }
};

export const rejectGif = async (req, res) => {
  try {
    const { id } = req.params;
    const gif = await pool.query('SELECT * FROM gifs WHERE id = $1', [id]);
    
    if (gif.rows[0]) {
      const filePath = path.join(process.cwd(), 'uploads', gif.rows[0].filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Gif.delete(id);
    res.json({ message: 'GIF rejected and deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject gif' });
  }
};

export const getAllGifs = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT g.*, u.username FROM gifs g JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch gifs' });
  }
};

export const deletePublishedGif = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑 Attempting to delete GIF:', id);
    
    const gif = await pool.query('SELECT * FROM gifs WHERE id = $1', [id]);
    
    if (!gif.rows[0]) {
      console.log('❌ GIF not found:', id);
      return res.status(404).json({ error: 'GIF not found' });
    }

    console.log('📄 GIF found:', gif.rows[0].filename);

    const filePath = path.join(process.cwd(), 'uploads', gif.rows[0].filename);
    console.log('📂 File path:', filePath);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('✅ File deleted:', filePath);
      } else {
        console.log('⚠️ File not found, but continuing:', filePath);
      }
    } catch (fileErr) {
      console.warn('⚠️ Error deleting file:', fileErr.message);
    }

    try {
      console.log('🗑 Deleting from database...');
      await Gif.delete(id);
      console.log('✅ GIF deleted from database:', id);
    } catch (dbErr) {
      console.error('❌ Database delete error:', dbErr.message);
      throw dbErr;
    }
    
    try {
      console.log('📨 Sending notification...');
      await Notification.create(
        gif.rows[0].user_id,
        'gif_deleted',
        id,
        null,
        `Ваш GIF "${gif.rows[0].title}" был удален администратором`
      );
      console.log('✅ Notification sent');
    } catch (notifErr) {
      console.warn('⚠️ Failed to send notification:', notifErr.message);
    }

    console.log('✅ Delete completed successfully');
    res.json({ message: 'GIF deleted successfully' });
  } catch (error) {
    console.error('❌ Delete error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to delete gif', details: error.message });
  }
};

export const updatePendingGif = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      'UPDATE gifs SET title = $1, description = $2, tags = $3 WHERE id = $4 AND status = $5 RETURNING *',
      [title, description || null, tags || [], id, 'pending']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GIF not found or is not pending' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update gif' });
  }
};