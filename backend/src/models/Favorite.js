import pool from '../db.js';

export class Favorite {
  static async add(userId, gifId) {
    const result = await pool.query(
      'INSERT INTO favorites (user_id, gif_id) VALUES ($1, $2) RETURNING *',
      [userId, gifId]
    );
    return result.rows[0];
  }

  static async remove(userId, gifId) {
    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND gif_id = $2 RETURNING *',
      [userId, gifId]
    );
    return result.rows[0];
  }

  static async getUserFavorites(userId) {
    const result = await pool.query(
      `SELECT g.*, u.username, u.id as user_id,
              array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags,
              f.created_at
       FROM favorites f
       JOIN gifs g ON f.gif_id = g.id
       JOIN users u ON g.user_id = u.id
       LEFT JOIN gif_tags gt ON g.id = gt.gif_id
       LEFT JOIN tags t ON gt.tag_id = t.id
       WHERE f.user_id = $1 AND g.status = 'approved'
       GROUP BY g.id, u.username, u.id, f.created_at
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async check(userId, gifId) {
    const result = await pool.query(
      'SELECT * FROM favorites WHERE user_id = $1 AND gif_id = $2',
      [userId, gifId]
    );
    return result.rows[0] || null;
  }
}