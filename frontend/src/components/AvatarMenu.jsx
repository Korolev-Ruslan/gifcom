import { useEffect, useRef, useState } from 'react'
import '../styles/AvatarMenu.css'

export default function AvatarMenu({ anchorRef, onClose, onLogout }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchorRef?.current) return

    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, left: rect.right - 220 })
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
      if (ref.current && !ref.current.contains(e.target) && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [onClose, anchorRef])

  return (
    <div className="avatar-menu" ref={ref} style={{ top: pos.top, left: pos.left }}>
      <ul>
        <li><a href="/channel/">Мой профиль</a></li>
        <li><a href="/upload">Мои GIF</a></li>
        <li><a href="/settings">Настройки</a></li>
        <li><button className="logout" onClick={onLogout}>Выйти</button></li>
      </ul>
    </div>
  )
}