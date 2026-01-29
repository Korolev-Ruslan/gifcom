import { useState, useEffect, useRef } from 'react'
import { notificationApi } from '../api/api'
import '../styles/NotificationsModal.css'

export default function NotificationsModal({ anchorRef, onClose, onAction }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const token = localStorage.getItem('token')
  const modalRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchorRef?.current) return

    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, left: rect.right - 380 })
    }

    updatePosition()

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition, true)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition, true)
    }
  }, [anchorRef])

  useEffect(() => {
    const handleOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target) && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [onClose, anchorRef])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    fetchNotifications()
  }, [token])

  const fetchNotifications = async () => {
    const currentToken = localStorage.getItem('token')
    if (!currentToken) {
      setNotifications([])
      setError('Требуется авторизация')
      setLoading(false)
      return
    }
    try {
      setError('')
      setLoading(true)
      const res = await notificationApi.getNotifications(currentToken)
      setNotifications(res.data.notifications || [])
    } catch (err) {
      console.error(err)
      if (err.response?.status === 401) {
        setNotifications([])
        setError('Сессия истекла. Войдите снова.')
      } else {
        setError('Ошибка загрузки уведомлений')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id) => {
    const currentToken = localStorage.getItem('token')
    if (!currentToken) return
    try {
      await notificationApi.markAsRead(id, currentToken)
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
      onAction && onAction()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    const currentToken = localStorage.getItem('token')
    if (!currentToken) return
    try {
      await notificationApi.deleteNotification(id, currentToken)
      setNotifications(notifications.filter(n => n.id !== id))
      onAction && onAction()
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAll = async () => {
    const currentToken = localStorage.getItem('token')
    if (!currentToken) return
    try {
      await notificationApi.markAllAsRead(currentToken)
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      onAction && onAction()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="notifications-modal" ref={modalRef} style={{ top: pos.top, left: pos.left }}>
      <div className="modal-header">
        <h4>Уведомления</h4>
        <div className="modal-actions">
          <button onClick={handleMarkAll} className="btn small">Отметить все</button>
          <button onClick={onClose} className="btn small">Закрыть</button>
        </div>
      </div>

      {loading && <div className="modal-body"><p>Загрузка...</p></div>}
      {error && <div className="modal-body error">{error}</div>}

      {!loading && !error && (
        <div className="modal-body">
          {notifications.length === 0 ? (
            <div className="empty">У вас нет уведомлений</div>
          ) : (
            <ul className="notifications-list">
              {notifications.map(n => (
                <li key={n.id} className={`notification ${!n.is_read ? 'unread' : ''}`}>
                  <div className="left">
                    <div className="icon">{n.type === 'comment' ? '💬' : n.type === 'gif_approved' ? '🎉' : '🔔'}</div>
                  </div>
                  <div className="content">
                    <div className="text">{n.message || (n.from_username ? `${n.from_username} взаимодействовал` : 'Уведомление')}</div>
                    <div className="meta">{new Date(n.created_at).toLocaleString('ru-RU')}</div>
                  </div>
                  <div className="actions">
                    {!n.is_read && <button onClick={() => handleMarkAsRead(n.id)} className="btn small">✓</button>}
                    <button onClick={() => handleDelete(n.id)} className="btn small danger">✕</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}