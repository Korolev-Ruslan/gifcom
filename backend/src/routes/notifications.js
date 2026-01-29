import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Notification from '../models/Notification.js'

const router = express.Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = 20
    const offset = (page - 1) * limit

    const notifications = await Notification.getByUserId(req.user.id, limit, offset)
    
    res.json({
      notifications,
      page,
      limit
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

router.get('/unread/count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id)
    res.json({ unread_count: count })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({ error: 'Failed to fetch unread count' })
  }
})

router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.markAsRead(req.params.id)
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ message: 'Notification marked as read', notification })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ error: 'Failed to update notification' })
  }
})

router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.markAllAsRead(req.user.id)
    res.json({ message: 'All notifications marked as read', count: notifications.length })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({ error: 'Failed to update notifications' })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.deleteNotification(req.params.id)
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ message: 'Notification deleted' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

export default router