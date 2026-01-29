import pool from '../db.js';
import bcrypt from 'bcryptjs';

export class User {
  static async create(username, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, hashedPassword, 'user']
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await pool.query('SELECT id, username, email, role, created_at FROM users WHERE username = $1', [username]);
    return result.rows[0];
  }

  static async getPublicProfile(userId) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.created_at,
              COUNT(DISTINCT s.follower_id) as followers_count,
              COUNT(DISTINCT g.id) as gifs_count
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.following_id
       LEFT JOIN gifs g ON u.id = g.user_id AND g.status = 'approved'
       WHERE u.id = $1
       GROUP BY u.id, u.username, u.created_at`,
      [userId]
    );
    return result.rows[0];
  }

  static async isSubscribed(followerId, followingId) {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  static async subscribe(followerId, followingId) {
    if (followerId === followingId) {
      throw new Error('Cannot subscribe to yourself');
    }
    const result = await pool.query(
      'INSERT INTO subscriptions (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [followerId, followingId]
    );
    return result.rows[0];
  }

  static async unsubscribe(followerId, followingId) {
    await pool.query(
      'DELETE FROM subscriptions WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
  }

  static async getSubscriptions(userId) {
    const result = await pool.query(
      'SELECT u.id, u.username, u.created_at FROM users u JOIN subscriptions s ON u.id = s.following_id WHERE s.follower_id = $1',
      [userId]
    );
    return result.rows;
  }

  static async getFollowers(userId) {
    const result = await pool.query(
      'SELECT u.id, u.username, u.created_at FROM users u JOIN subscriptions s ON u.id = s.follower_id WHERE s.following_id = $1',
      [userId]
    );
    return result.rows;
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }
}