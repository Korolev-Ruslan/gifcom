import db from '../db.js'

class Notification {
  static async create(userId, type, gifId = null, fromUserId = null, message = null) {
    const query = `
      INSERT INTO notifications (user_id, type, gif_id, from_user_id, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    const result = await db.query(query, [userId, type, gifId, fromUserId, message])
    return result.rows[0]
  }

  static async getByUserId(userId, limit = 50, offset = 0) {
    const query = `
      SELECT n.*, 
             u.username as from_username,
             g.title as gif_title
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      LEFT JOIN gifs g ON n.gif_id = g.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `
    const result = await db.query(query, [userId, limit, offset])
    return result.rows
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
    `
    const result = await db.query(query, [userId])
    return result.rows[0].unread_count
  }

  static async markAsRead(notificationId) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1
      RETURNING *
    `
    const result = await db.query(query, [notificationId])
    return result.rows[0]
  }

  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
      RETURNING *
    `
    const result = await db.query(query, [userId])
    return result.rows
  }

  static async deleteNotification(notificationId) {
    const query = `
      DELETE FROM notifications
      WHERE id = $1
      RETURNING *
    `
    const result = await db.query(query, [notificationId])
    return result.rows[0]
  }
}

export default Notification