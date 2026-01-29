import pool from '../db.js';

export class Gif {
  static async create(userId, filename, title, description, tags = [], fileHash = null) {
    const result = await pool.query(
      'INSERT INTO gifs (user_id, filename, title, description, status, file_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, user_id, filename, title, description, status, file_hash, created_at',
      [userId, filename, title, description, 'pending', fileHash]
    );
    
    const gifId = result.rows[0].id;
    
    if (tags.length > 0) {
      for (const tagName of tags) {
        const tagResult = await pool.query(
          'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
          [tagName.toLowerCase().trim()]
        );
        await pool.query(
          'INSERT INTO gif_tags (gif_id, tag_id) VALUES ($1, $2)',
          [gifId, tagResult.rows[0].id]
        );
      }
    }
    
    return result.rows[0];
  }

  static async findByHash(hash) {
    const result = await pool.query(
      'SELECT * FROM gifs WHERE file_hash = $1',
      [hash]
    );
    return result.rows[0] || null;
  }

  static async findByHashAndUser(hash, userId) {
    const result = await pool.query(
      'SELECT * FROM gifs WHERE file_hash = $1 AND user_id = $2',
      [hash, userId]
    );
    return result.rows[0] || null;
  }

  static async countByUser(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM gifs WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0]?.count || 0);
  }

  static async findAll(approved = true, limit = 20, offset = 0, excludeIds = []) {
    const params = []
    let whereClause = ''
    if (approved) {
      params.push('approved')
      whereClause = `WHERE g.status = $${params.length}`
    }

    if (excludeIds && excludeIds.length > 0) {
      const placeholders = excludeIds.map((_, i) => `$${params.length + i + 1}`).join(', ')
      params.push(...excludeIds)
      whereClause += `${whereClause ? ' AND' : ' WHERE'} g.id NOT IN (${placeholders})`
    }

    params.push(limit)
    params.push(offset)

    const query = `
      SELECT g.*, u.username,
             ARRAY_AGG(DISTINCT t.name) as tags,
             COUNT(DISTINCT s.follower_id) as subscriber_count
      FROM gifs g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN gif_tags gt ON g.id = gt.gif_id
      LEFT JOIN tags t ON gt.tag_id = t.id
      LEFT JOIN subscriptions s ON g.user_id = s.following_id
      ${whereClause}
      GROUP BY g.id, u.username
      ORDER BY g.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `

    const result = await pool.query(query, params)
    return result.rows
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT g.*, u.username, u.id as user_id_full,
              ARRAY_AGG(DISTINCT t.name) as tags
       FROM gifs g 
       JOIN users u ON g.user_id = u.id
       LEFT JOIN gif_tags gt ON g.id = gt.gif_id
       LEFT JOIN tags t ON gt.tag_id = t.id
       WHERE g.id = $1
       GROUP BY g.id, u.username, u.id`,
      [id]
    );
    return result.rows[0];
  }

  static async searchByTitle(query) {
    const result = await pool.query(
      `SELECT g.*, u.username,
              ARRAY_AGG(DISTINCT t.name) as tags
       FROM gifs g 
       JOIN users u ON g.user_id = u.id
       LEFT JOIN gif_tags gt ON g.id = gt.gif_id
       LEFT JOIN tags t ON gt.tag_id = t.id
       WHERE g.status = 'approved' AND g.title ILIKE $1
       GROUP BY g.id, u.username
       ORDER BY g.created_at DESC`,
      [`%${query}%`]
    );
    return result.rows;
  }

  static async searchByTag(tag) {
    const result = await pool.query(
      `SELECT g.*, u.username,
              ARRAY_AGG(DISTINCT t.name) as tags
       FROM gifs g 
       JOIN users u ON g.user_id = u.id
       LEFT JOIN gif_tags gt ON g.id = gt.gif_id
       LEFT JOIN tags t ON gt.tag_id = t.id
       WHERE g.status = 'approved' AND t.name ILIKE $1
       GROUP BY g.id, u.username
       ORDER BY g.created_at DESC`,
      [`%${tag}%`]
    );
    return result.rows;
  }

  static async findByUserId(userId) {
    const result = await pool.query(
      `SELECT g.*, u.username,
              ARRAY_AGG(DISTINCT t.name) as tags,
              COUNT(DISTINCT c.id) as comments_count,
              AVG(CASE WHEN r.reaction IS NOT NULL THEN 1 ELSE 0 END) as reaction_count
       FROM gifs g 
       JOIN users u ON g.user_id = u.id
       LEFT JOIN gif_tags gt ON g.id = gt.gif_id
       LEFT JOIN tags t ON gt.tag_id = t.id
       LEFT JOIN comments c ON g.id = c.gif_id
       LEFT JOIN ratings r ON g.id = r.gif_id
       WHERE g.user_id = $1 AND g.status = 'approved'
       GROUP BY g.id, u.username
       ORDER BY g.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async updateStatus(id, status) {
    const result = await pool.query(
      'UPDATE gifs SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM gifs WHERE id = $1', [id]);
  }

  static async updateFilename(id, filename) {
    const result = await pool.query(
      'UPDATE gifs SET filename = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [filename, id]
    );
    return result.rows[0];
  }

  static async getTags(gifId) {
    const result = await pool.query(
      'SELECT t.id, t.name FROM tags t JOIN gif_tags gt ON t.id = gt.tag_id WHERE gt.gif_id = $1',
      [gifId]
    );
    return result.rows;
  }
}
