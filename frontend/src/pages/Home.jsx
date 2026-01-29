import { useState, useEffect, useRef } from 'react'
import { gifApi } from '../api/api'
import { Link } from 'react-router-dom'
import TagNav from '../components/TagNav'
import Masonry from 'react-masonry-css'
import '../styles/Home.css'

function Home() {
  const [gifs, setGifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [page, setPage] = useState(1)
  const [ended, setEnded] = useState(false)
  const shownIdsRef = useRef(new Set(JSON.parse(sessionStorage.getItem('shownGifIds') || '[]')))

  useEffect(() => {
    resetAndFetch()
  }, [])

  useEffect(() => {
    resetAndFetch()
  }, [selectedTag])

  useEffect(() => {
    const onScroll = () => {
      if (ended || loadingMore || loading) return
      if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 800)) {
        loadMore()
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [ended, loadingMore, loading])

  const resetAndFetch = async () => {
    setGifs([])
    setPage(1)
    setEnded(false)
    shownIdsRef.current = new Set()
    sessionStorage.setItem('shownGifIds', JSON.stringify([]))
    await fetchGifs(1)
  }

  const fetchGifs = async (pageToLoad = 1) => {
    try {
      if (pageToLoad === 1) setLoading(true)
      else setLoadingMore(true)

      const excludeIds = Array.from(shownIdsRef.current)
      const params = { page: pageToLoad }
      if (excludeIds.length) params.exclude_ids = excludeIds.join(',')
      if (selectedTag) params.tag = selectedTag

      const response = await gifApi.getApproved(params)
      const data = response.data?.gifs || []

      const newItems = data.filter(g => !shownIdsRef.current.has(g.id))

      if (newItems.length === 0) {
        setEnded(true)
      } else {
        newItems.forEach(g => shownIdsRef.current.add(g.id))
        sessionStorage.setItem('shownGifIds', JSON.stringify(Array.from(shownIdsRef.current)))
        setGifs(prev => [...prev, ...newItems])
      }
    } catch (err) {
      console.error(err)
      setError('Ошибка при загрузке GIF')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = async () => {
    if (ended) return
    const next = page + 1
    setPage(next)
    await fetchGifs(next)
  }

  if (loading) return <div className="main-content"><p>Загружается...</p></div>

  const breakpointColumnsObj = {
    default: 6,
    1920: 5,
    1280: 4,
    720: 4,
    480: 2
  };

  return (
    <div className="main-content">
      <TagNav selectedTag={selectedTag} onTagSelect={setSelectedTag} />

      {error && <div className="error">{error}</div>}

      {gifs.length === 0 && !loading ? (
        <p>GIF не найдены</p>
      ) : (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="gifs-grid"
          columnClassName="gif-column"
        >
          {gifs.map((gif) => (
            <Link key={gif.id} to={`/gif/${gif.id}`} className="gif-card">
              <img src={`http://localhost:3000/${gif.filename}`} alt={gif.title} />
            </Link>
          ))}
        </Masonry>
      )}

      {loadingMore && <div className="loading-more">Загрузка...</div>}
      {ended && <div className="end-message">GIF'ки закончились? Обновите страницу!</div>}
    </div>
  )
}

export default Home