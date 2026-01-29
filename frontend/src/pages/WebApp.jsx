import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WebApp.css';

const WebApp = () => {
  const [isWebApp, setIsWebApp] = useState(false);
  const [tgUser, setTgUser] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      setIsWebApp(true);
      setTgUser(tg.initData);
      tg.ready();
      tg.setHeaderColor('#2a2a2a');
      tg.setBackgroundColor('#1a1a1a');
      console.log('📱 Telegram WebApp initialized');
      console.log('👤 User data:', tg.initData);
    } else {
      console.log('⚠️ Telegram WebApp API not available');
    }
  }, []);

  const handleShare = (gifId) => {
    if (window.Telegram?.WebApp) {
      const shareText = `Посмотри эту классную GIF на GIFcom! 🎬\n\nСсылка: ${window.location.origin}/gif/${gifId}`;
      window.Telegram.WebApp.shareToStory(shareText, {
        text: 'Поделиться в Stories'
      });
    }
  };

  const handleSendToChat = (gifId) => {
    if (window.Telegram?.WebApp) {
      const shareUrl = `${window.location.origin}/gif/${gifId}`;
      window.Telegram.WebApp.sendData(JSON.stringify({
        action: 'share_gif',
        gif_id: gifId,
        url: shareUrl
      }));
      setMessage('✅ GIF отправлена!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleBackButton = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.close();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="webapp-container">
      <div className="webapp-header">
        <h1>🎬 GIFcom WebApp</h1>
        <p>Смотрите и делитесь GIF прямо из Telegram!</p>
      </div>

      {isWebApp && tgUser && (
        <div className="webapp-info">
          <div className="info-card">
            <span>📱</span>
            <p>Web App активен</p>
          </div>
        </div>
      )}

      {message && <div className="webapp-message">{message}</div>}

      <div className="webapp-content">
        <div className="feature-grid">
          <div className="feature-card">
            <h3>📤 Загрузка</h3>
            <p>Загружайте GIF файлы и видео через основной сайт</p>
            <button onClick={() => navigate('/upload')}>
              Загрузить GIF
            </button>
          </div>

          <div className="feature-card">
            <h3>👁️ Просмотр</h3>
            <p>Смотрите тысячи GIF от других пользователей</p>
            <button onClick={() => navigate('/')}>
              Смотреть GIF
            </button>
          </div>

          <div className="feature-card">
            <h3>🔍 Поиск</h3>
            <p>Найдите нужную GIF по тегам и названиям</p>
            <button onClick={() => navigate('/')}>
              Поиск
            </button>
          </div>

          <div className="feature-card">
            <h3>📤 Поделиться</h3>
            <p>Отправляйте GIF в чаты прямо из Web App</p>
            <p className="text-small">Кнопка будет доступна на странице GIF</p>
          </div>
        </div>

        <div className="webapp-help">
          <h3>💡 Как использовать</h3>
          <ol>
            <li>Откройте сайт в Web App</li>
            <li>Посмотрите или загрузите GIF</li>
            <li>Нажмите "Поделиться в чат"</li>
            <li>Выберите контакт и отправьте</li>
          </ol>
        </div>

        {isWebApp ? (
          <div className="webapp-actions">
            <button className="btn-primary" onClick={() => navigate('/')}>
              ← Назад к сайту
            </button>
          </div>
        ) : (
          <div className="webapp-notice">
            <p>⚠️ Это приложение предназначено для использования внутри Telegram</p>
            <p>Откройте ссылку через Telegram бота для лучшего опыта</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebApp;