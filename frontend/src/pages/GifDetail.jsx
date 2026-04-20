import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { gifApi, ratingApi, userApi, adminApi, favoriteApi } from '../api/api'
import { API_ORIGIN } from '../config'
import Masonry from 'react-masonry-css'
import '../styles/GifDetail.css'

const REACTIONS = ['😀', '😍', '🤣', '😢', '😡']

function GifDetail({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [gif, setGif] = useState(null)
  const [reactions, setReactions] = useState({})
  const [userReaction, setUserReaction] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [suggestedGifs, setSuggestedGifs] = useState([])
  const [suggestedLoading, setSuggestedLoading] = useState(false)
  const breakpointColumnsObj = {
    default: 6,
    1920: 5,
    1280: 4,
    720: 4,
    480: 2
  }

  useEffect(() => {
    fetchData()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const gifRes = await gifApi.getById(id)
      setGif(gifRes.data)

      const reactionsRes = await ratingApi.get(id)
      setReactions(reactionsRes.data)

      await fetchSuggestions(gifRes.data)

      if (user) {
        const userReactionRes = await ratingApi.getUserReaction(id, localStorage.getItem('token'))
        setUserReaction(userReactionRes.data.reaction)

        if (gifRes.data.user_id_full) {
          const subRes = await userApi.isSubscribed(gifRes.data.user_id_full, localStorage.getItem('token'))
          setIsSubscribed(subRes.data.isSubscribed)
          const favRes = await favoriteApi.check(id, localStorage.getItem('token'))
          setIsFavorite(favRes.data.isFavorite)
        }
      }
    } catch (err) {
      setError('Ошибка при загрузке данных')
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async (gifData) => {
    setSuggestedLoading(true)
    try {
      const tags = (gifData?.tags || []).filter(Boolean)
      let items = []

      if (tags.length > 0) {
        const tagRes = await gifApi.search(null, tags[0])
        const tagItems = Array.isArray(tagRes.data) ? tagRes.data : (tagRes.data?.gifs || [])
        items = tagItems.filter(item => item.id !== gifData.id)
      }

      if (items.length < 8) {
        const moreRes = await gifApi.getApproved({ limit: 12, exclude_ids: gifData.id })
        const moreItems = moreRes.data?.gifs || []
        const existing = new Set(items.map(item => item.id))
        moreItems.forEach(item => {
          if (!existing.has(item.id) && item.id !== gifData.id) {
            items.push(item)
          }
        })
      }

      setSuggestedGifs(items.slice(0, 12))
    } catch (err) {
      setSuggestedGifs([])
    } finally {
      setSuggestedLoading(false)
    }
  }

  const handleReaction = async (reaction) => {
    if (!user) {
      alert('Войдите для оценки')
      return
    }

    try {
      await ratingApi.add(id, reaction, localStorage.getItem('token'))
      setUserReaction(reaction)
      fetchData()
    } catch (err) {
      setError('Ошибка при сохранении оценки')
    }
  }

  const handleSubscribe = async () => {
    if (!user) {
      alert('Войдите для подписки')
      return
    }

    try {
      if (isSubscribed) {
        await userApi.unsubscribe(gif.user_id_full, localStorage.getItem('token'))
      } else {
        await userApi.subscribe(gif.user_id_full, localStorage.getItem('token'))
      }
      setIsSubscribed(!isSubscribed)
    } catch (err) {
      alert('Ошибка при изменении подписки')
    }
  }

  const handleToggleFavorite = async () => {
  if (!user) {
    alert('Войдите для добавления в избранное')
    return
  }

  try {
    if (isFavorite) {
      await favoriteApi.remove(id, localStorage.getItem('token'))
      setIsFavorite(false)
    } else {
      await favoriteApi.add(id, localStorage.getItem('token'))
      setIsFavorite(true)
    }
  } catch (err) {
    alert('Ошибка при изменении избранного')
  }
}

  const handleDownload = async () => {
    try {
      const response = await gifApi.download(id)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', gif.filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      setError('Ошибка при скачивании')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены? Это действие необратимо.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      console.log('🗑 Starting delete request with token:', token ? 'exists' : 'missing')
      console.log('🗑 GIF ID:', id)
      
      await adminApi.delete(id, token)
      alert('GIF удалена')
      navigate('/')
    } catch (err) {
      console.error('Delete error full:', err)
      console.error('Error status:', err.response?.status)
      console.error('Error data:', err.response?.data)
      console.error('Error message:', err.message)
      console.error('Error code:', err.code)
      
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Unknown error'
      setError(`Ошибка при удалении GIF: ${errorMsg}`)
    }
  }

  if (loading) return <div className="container"><p>Загружается...</p></div>
  if (error) return <div className="container error">{error}</div>
  if (!gif) return <div className="container"><p>GIF не найдена</p></div>

  return (
    <div className="container gif-detail-page">
      <div className="gif-detail-wrapper">
        <div className="gif-detail">
          <div className="gif-display">
            <img src={`${API_ORIGIN}/${gif.filename}`} alt={gif.title} />
            <div className="gif-actions" />
          </div>

          <div className="gif-info">
          <h1>{gif.title}</h1>
          
          <div className="author-section">
            <div className="author-info">
              <Link to={`/channel/${gif.username}`} className="author-link">
                <span className="author-name">📺 {gif.username}</span>
              </Link>
            </div>
            <div className="buttons-group">
              {user && user.id !== gif.user_id_full && (
                <button 
                  className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
                  onClick={handleSubscribe}
                >
                  {isSubscribed ? '✓ Подписан' : '+ Подписаться'}
                </button>
              )}
              {user && (
                <button 
                  onClick={handleToggleFavorite} 
                  className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                  title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                >
                  {isFavorite ? '❤️ В избранном' : '🤍 В избранное'}
                </button>
              )}
              <button onClick={handleDownload} className="download-btn">
                ⬇ Скачать GIF
              </button>
              {user && user.role === 'admin' && (
                <button onClick={handleDelete} className="delete-btn">
                  🗑 Удалить
                </button>
              )}
            </div>
          </div>

          {gif.description && <p className="description">{gif.description}</p>}

          {gif.tags && gif.tags.length > 0 && (
            <div className="tags">
              {gif.tags.map(tag => tag && (
                <Link key={tag} to={`/?tag=${tag}`} className="tag">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <div className="reactions-section">
            <div className="reactions">
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  onClick={() => handleReaction(reaction)}
                  className={`reaction-btn ${userReaction === reaction ? 'active' : ''}`}
                  title={`${reactions[reaction] || 0} человека`}
                >
                  <span className="emoji">{reaction}</span>
                  <span className="count">{reactions[reaction] || 0}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
      </div>

      <div className="suggested-section">
        {suggestedLoading ? (
          <p>Загружается...</p>
        ) : suggestedGifs.length === 0 ? (
          <p>Пока нет рекомендаций</p>
        ) : (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="gifs-grid"
            columnClassName="gif-column"
          >
            {suggestedGifs.map((item) => (
              <Link key={item.id} to={`/gif/${item.id}`} className="gif-card suggested-card">
                <img
                  src={`${API_ORIGIN}/${item.filename}`}
                  alt={item.title || 'GIF'}
                  loading="lazy"
                />
                <div className="suggested-meta">
                  <span className="suggested-title">{item.title || 'Без названия'}</span>
                  <span className="suggested-author">@{item.username}</span>
                </div>
              </Link>
            ))}
          </Masonry>
        )}
      </div>
    </div>
  )
}

export default GifDetail