import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { gifApi, userApi } from '../api/api'
import { API_ORIGIN } from '../config'
import '../styles/UserProfile.css'

function UserProfile({ user }) {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [gifs, setGifs] = useState([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUserData()
  }, [username])

  const fetchUserData = async () => {
    try {
      const response = await gifApi.getUserGifs(username)
      setProfile(response.data.profile)
      setGifs(response.data.gifs)

      if (user && response.data.profile) {
        const subRes = await userApi.isSubscribed(response.data.profile.id, localStorage.getItem('token') || '')
        setIsSubscribed(subRes.data.isSubscribed)
      }
    } catch (err) {
      setError('Канал не найден')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!user) {
      alert('Войдите для подписки')
      return
    }

    try {
      if (isSubscribed) {
        await userApi.unsubscribe(profile.id, localStorage.getItem('token'))
      } else {
        await userApi.subscribe(profile.id, localStorage.getItem('token'))
      }
      setIsSubscribed(!isSubscribed)
    } catch (err) {
      alert('Ошибка при изменении подписки')
    }
  }

  if (loading) return <div className="container"><p>Загружается...</p></div>
  if (error) return <div className="container error">{error}</div>

  return (
    <div className="container">
      {profile && (
        <div className="profile-header">
          <div className="profile-info">
            <h1>{profile.username}</h1>
            <div className="profile-stats">
              <div className="stat">
                <span className="stat-number">{profile.gifs_count}</span>
                <span className="stat-label">GIF</span>
              </div>
              <div className="stat">
                <span className="stat-number">{profile.followers_count}</span>
                <span className="stat-label">Подписчиков</span>
              </div>
            </div>
          </div>
          
          {user && user.id !== profile.id && (
            <button 
              className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
              onClick={handleSubscribe}
            >
              {isSubscribed ? '✓ Подписан' : '+ Подписаться'}
            </button>
          )}
        </div>
      )}

      <h2>GIF канала</h2>
      {gifs.length === 0 ? (
        <p>Нет GIF</p>
      ) : (
        <div className="gifs-grid">
          {gifs.map((gif) => (
            <Link key={gif.id} to={`/gif/${gif.id}`} className="user-gif-card">
              <img src={`${API_ORIGIN}/${gif.filename}`} alt={gif.title} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default UserProfile