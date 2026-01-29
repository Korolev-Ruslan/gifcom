import { useState, useEffect } from 'react';
import { favoriteApi } from '../api/api';
import { useTheme } from '../context/ThemeContext.jsx';
import { Link } from 'react-router-dom';
import Masonry from 'react-masonry-css';
import '../styles/Home.css';

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await favoriteApi.getAll(token);
      setFavorites(response.data.favorites || []);
    } catch (err) {
      console.error(err);
      setError('Ошибка при загрузке избранного');
    } finally {
      setLoading(false);
    }
  };

  const breakpointColumnsObj = {
    default: 6,
    1920: 5,
    1280: 4,
    720: 4,
    480: 2
  };

  if (loading) return <div className="main-content"><p>Загружается...</p></div>;

  const userIsLoggedIn = true;

  return (
    <div className="main-content">
      <h1>❤️ Избранное</h1>
      
      {error && <div className="error">{error}</div>}
      
      {!userIsLoggedIn && (
        <p>Войдите, чтобы видеть избранное</p>
      )}

      {userIsLoggedIn && favorites.length === 0 && (
        <p>У вас пока нет избранных GIF-ок</p>
      )}

      {userIsLoggedIn && favorites.length > 0 && (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="gifs-grid"
          columnClassName="gif-column"
        >
          {favorites.map((gif) => (
            <Link key={gif.id} to={`/gif/${gif.id}`} className="gif-card">
              <img src={`http://localhost:3000/${gif.filename}`} alt={gif.title} />
            </Link>
          ))}
        </Masonry>
      )}
    </div>
  );
}

export default Favorites;