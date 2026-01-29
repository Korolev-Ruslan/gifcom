import { useState, useEffect } from 'react'
import { notificationApi } from '../api/api'
import '../styles/Notifications.css'

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await notificationApi.getNotifications(token)
      setNotifications(response.data.notifications)
    } catch (err) {
      setError('Ошибка при загрузке уведомлений')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId, token)
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead(token)
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const handleDelete = async (notificationId) => {
    try {
      await notificationApi.deleteNotification(notificationId, token)
      setNotifications(notifications.filter(n => n.id !== notificationId))
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'gif_approved':
        return '🎉'
      case 'comment':
        return '💬'
      case 'reaction':
        return '😊'
      default:
        return '🔔'
    }
  }

  const getNotificationText = (notification) => {
    switch (notification.type) {
      case 'gif_approved':
        return `${notification.message}`
      case 'comment':
        return `${notification.message}`
      case 'reaction':
        return `${notification.from_username} реагировал на ваш GIF`
      default:
        return notification.message
    }
  }

  if (loading) {
    return <div className="container"><p>Загрузка...</p></div>
  }

  return (
    <div className="container notifications-container">
      <div className="notifications-header">
        <h2>🔔 Уведомления</h2>
        {notifications.some(n => !n.is_read) && (
          <button onClick={handleMarkAllAsRead} className="mark-all-btn">
            Отметить все как прочитанные
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p>У вас нет уведомлений</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
            >
              <div className="notification-content">
                <span className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="notification-text">
                  <p>{getNotificationText(notification)}</p>
                  <small>{new Date(notification.created_at).toLocaleString('ru-RU')}</small>
                </div>
              </div>
              <div className="notification-actions">
                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="mark-read-btn"
                    title="Отметить как прочитанное"
                  >
                    ✓
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notification.id)}
                  className="delete-btn"
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications