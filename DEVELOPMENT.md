# DEVELOPMENT.md - Гайд для разработчиков

Документация по архитектуре, структуре кода, процессам и расширению GIFCOM.

---

## Содержание

1. [Архитектура](#архитектура)
2. [Структура файлов](#структура-файлов)
3. [Зависимости](#зависимости)
4. [Процессы разработки](#процессы-разработки)
5. [Расширение функционала](#расширение-функционала)
6. [Тестирование](#тестирование)
7. [Безопасность](#безопасность)
8. [Соглашения кода](#соглашения-кода)

---

## Архитектура

### Общая архитектура системы

```
GIFCOM v2.0 Архитектура

FRONTEND (React)              BACKEND (Express)
:3000                         :3000
  | HTTP REST                   |
  |                             |
Home (сетка)      <----->      Auth API
GifDetail                      Gifs API
UserProfile                    Users API
Upload                        Comments API
AdminPanel                    Ratings API
                              Admin API
                                |
                                |
                      PostgreSQL БД :5432
                      (users, gifs, tags,
                       ratings, comments, subscriptions)
```

### Модель данных (ERD)

```
users                         gifs
-----                         ----
id (PK)              <------- id (PK)
username (UNIQ)      1    M   user_id (FK)
email (UNIQ)                  filename
password                      title
role                          description
created_at                    status
                               created_at
       |                      updated_at
       |
       |          +-----------+-----------+
       |          |           |           |
       |    comments     ratings     gif_tags
       |    --------     -------     --------
       |    comment      reaction    gif_id (FK)
       |    user_id      emoji       tag_id (FK)
       |    created
       |
subscriptions
----
follower_id (FK)     Подписчик следит за контентом
following_id (FK)    Автор публикует GIF-ки
created_at
```

### Поток данных

#### Загрузка GIF-ки

1. Пользователь заполняет форму (React)
2. POST /api/gifs/upload с JWT
3. Backend сохраняет файл, делает INSERT в БД (status='pending')
4. GIF ожидает модерации
5. AdminPanel -> POST /admin/approve/:id
6. GIF одобрена (status='approved')
7. GIF видна на главной странице

#### Система реакций

Пользователь видит GIF -> Кликает эмоджи -> 
POST /api/ratings/:gifId с { emoji: 'smile' } ->
Backend проверяет JWT -> INSERT/UPDATE в ratings ->
Frontend обновляет UI

#### Система подписок

Пользователь B видит GIF от A ->
Кликает "Подписаться" ->
POST /api/users/:userId/subscribe ->
INSERT в subscriptions ->
B видит GIF-ки от A в рекомендациях

---

## Структура файлов

### Backend структура (backend/src/)

```
backend/
├── index.js              # Главный файл (Express конфиг)
├── db.js                 # Подключение к PostgreSQL
├── middleware/
│   └── auth.js           # JWT проверка и authMiddleware
├── models/
│   ├── User.js           # Модель пользователя
│   ├── Gif.js            # Модель GIF-ок
│   └── Notification.js   # (опционально)
├── controllers/
│   ├── authController.js # Регистрация и вход
│   ├── gifController.js  # Загрузка, поиск, скачивание
│   ├── adminController.js# Модерация GIF-ок
│   └── (другие контроллеры)
└── routes/
    ├── auth.js           # POST /register, /login
    ├── gifs.js           # GET/POST для GIF-ок
    ├── comments.js       # GET/POST для комментариев
    ├── ratings.js        # GET/POST для реакций
    ├── users.js          # Профили, подписки
    ├── admin.js          # Модерация
    └── check.js          # Проверка хешей файлов
```

### Frontend структура (frontend/src/)

```
frontend/src/
├── main.jsx              # Точка входа React
├── App.jsx               # Главный компонент с маршрутами
├── App.css               # Стили навигации
├── index.css             # Глобальные стили
├── api/
│   └── api.js            # Axios экземпляр и функции API
├── context/
│   └── ThemeContext.jsx  # Контекст для темы (опционально)
├── hooks/
│   └── useOutsideClick.js# Кастомный хук для закрытия модалей
├── components/
│   ├── AuthModal.jsx     # Модаль входа/регистрации
│   ├── Sidebar.jsx       # Боковая панель
│   ├── TagNav.jsx        # Навигация по тегам
│   ├── SearchAutocomplete.jsx  # Автодополнение поиска
│   ├── AvatarMenu.jsx    # Меню пользователя
│   └── NotificationsModal.jsx  # (опционально)
├── pages/
│   ├── Home.jsx          # Главная (сетка GIF)
│   ├── Login.jsx         # Страница входа
│   ├── Register.jsx      # Страница регистрации
│   ├── Upload.jsx        # Загрузка GIF
│   ├── GifDetail.jsx     # Страница GIF (реакции, комментарии)
│   ├── UserProfile.jsx   # Профиль/канал пользователя
│   ├── AdminPanel.jsx    # Админ-панель (модерация)
│   └── Notifications.jsx # (опционально)
└── styles/
    ├── Home.css          # Стили главной
    ├── GifDetail.css     # Стили страницы GIF
    ├── UserProfile.css   # Стили профиля
    ├── Upload.css        # Стили формы загрузки
    ├── AdminPanel.css    # Стили админ-панели
    ├── Auth.css          # Стили форм
    ├── AuthModal.css     # Стили модали
    ├── Sidebar.css       # Стили меню
    └── (другие стили)
```

### Database структура (backend/database.sql)

```sql
-- Таблицы:
users                 -- Пользователи (id, username, email, password, role)
gifs                  -- GIF-ки (id, user_id, filename, title, description, status)
tags                  -- Теги (id, name)
gif_tags              -- Связь GIF-ок и тегов (gif_id, tag_id)
ratings               -- Реакции (id, gif_id, user_id, reaction)
comments              -- Комментарии (id, gif_id, user_id, text)
subscriptions         -- Подписки (id, follower_id, following_id)

-- Индексы для оптимизации запросов
-- Constraints для целостности данных
```

---

## Зависимости

### Backend зависимости (backend/package.json)

| Пакет | Версия | Назначение |
|-------|--------|------------|
| express | ^4.18.2 | Веб-фреймворк, HTTP сервер |
| pg | ^8.10.0 | PostgreSQL клиент для Node.js |
| bcryptjs | ^2.4.3 | Хеширование паролей |
| jsonwebtoken | ^9.0.0 | JWT токены для аутентификации |
| cors | ^2.8.5 | CORS middleware для кросс-доменных запросов |
| multer | ^1.4.5-lts.1 | Загрузка файлов (multipart/form-data) |
| dotenv | ^16.3.1 | Загрузка переменных окружения |
| express-validator | ^7.0.0 | Валидация запросов |
| fluent-ffmpeg | ^2.1.2 | Работа с видео/GIF |
| @ffmpeg-installer/ffmpeg | ^1.1.0 | FFmpeg бинарник для конвертации |
| gifsicle | ^7.0.1 | Оптимизация GIF файлов |

### Frontend зависимости (frontend/package.json)

| Пакет | Версия | Назначение |
|-------|--------|------------|
| react | ^18.2.0 | UI библиотека |
| react-dom | ^18.2.0 | React DOM рендеринг |
| react-router-dom | ^6.16.0 | Маршрутизация (страницы) |
| axios | ^1.5.0 | HTTP клиент для API запросов |
| react-masonry-css | ^1.0.16 | Masonry сетка для GIF |

### Dev зависимости

| Пакет | Где | Назначение |
|-------|-----|------------|
| vite | frontend | Сборка и dev server |
| @vitejs/plugin-react | frontend | React плагин для Vite |
| nodemon | backend | Автоперезапуск при изменении |

---

## Процессы разработки

### Добавление нового API endpoint-а

1. Создайте функцию в контроллере (backend/src/controllers/):

```javascript
// gifController.js
exports.newFeature = async (req, res) => {
  try {
    // Логика здесь
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

2. Добавьте маршрут (backend/src/routes/):

```javascript
// gifs.js
router.post('/new-feature', authMiddleware, gifController.newFeature);
```

3. Зарегистрируйте маршрут в index.js:

```javascript
// index.js
app.use('/api/gifs', require('./routes/gifs'));
```

4. Используйте в frontend (frontend/src/api/api.js):

```javascript
export const gifApi = {
  newFeature: (data) => axios.post('/gifs/new-feature', data)
};
```

5. Используйте в компоненте:

```javascript
import { gifApi } from '../api/api';

const result = await gifApi.newFeature(data);
```

### Добавление нового React компонента

1. Создайте файл компонента:

```javascript
// frontend/src/components/MyComponent.jsx
export function MyComponent({ prop1, prop2 }) {
  return (
    <div>
      {prop1} - {prop2}
    </div>
  );
}
```

2. Создайте стили (опционально):

```css
/* frontend/src/styles/MyComponent.css */
.my-component {
  /* стили */
}
```

3. Используйте в других компонентах:

```javascript
import { MyComponent } from '../components/MyComponent';

// В JSX:
<MyComponent prop1="value1" prop2="value2" />
```

### Добавление новой страницы

1. Создайте компонент страницы (frontend/src/pages/):

```javascript
import { useEffect, useState } from 'react';
import { gifApi } from '../api/api';
import '../styles/MyPage.css';

export function MyPage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    gifApi.getSomething()
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="my-page">
      {/* контент */}
    </div>
  );
}
```

2. Добавьте маршрут в App.jsx:

```javascript
import { MyPage } from './pages/MyPage';

<Route path="/my-page" element={<MyPage />} />
```

3. Добавьте ссылку в навигацию:

```javascript
// В Sidebar.jsx или другом месте
<Link to="/my-page">My Page</Link>
```

### Изменение БД схемы

1. Создайте миграцию (backend/migrations/):

```sql
-- backend/migrations/002_new_feature.sql
ALTER TABLE gifs ADD COLUMN new_field VARCHAR(255);
CREATE INDEX idx_gifs_new_field ON gifs(new_field);
```

2. Выполните миграцию:

```bash
psql -U postgres -d gifcom -f backend/migrations/002_new_feature.sql
```

3. Обновите модель (backend/src/models/Gif.js):

```javascript
// Добавьте новое поле при создании GIF
const newField = req.body.new_field;
```

4. Обновите контроллер (backend/src/controllers/gifController.js)

5. Обновите frontend компоненты

---

## Расширение функционала

### Пример 1: Добавить "Like" функцию

Backend:
1. Добавьте таблицу likes в БД
2. Создайте Likes модель
3. Создайте likeController
4. Добавьте маршруты POST /like, DELETE /unlike, GET /likes/:gifId
5. Добавьте middleware для проверки авторизации

Frontend:
1. Добавьте API функции в api.js
2. Добавьте иконку Like на GifDetail.jsx
3. Обновите состояние при клике
4. Покажите счетчик лайков

### Пример 2: Добавить "Сохранения" (Bookmarks)

Backend:
1. Таблица bookmarks (user_id, gif_id)
2. bookmarksController
3. Маршруты GET /my-bookmarks, POST /bookmark/:gifId, DELETE /unbookmark/:gifId

Frontend:
1. Новая страница MyBookmarks.jsx
2. Иконка сохранения на GifDetail
3. Меню для доступа к сохраненным

### Пример 3: Добавить "Уведомления"

Backend:
1. Таблица notifications
2. Создавайте уведомление при: подписке, комментарии, реакции
3. Маршруты GET /notifications, PATCH /notifications/:id/read

Frontend:
1. Компонент NotificationBell
2. Модаль NotificationsModal
3. Real-time обновления (опционально WebSocket)

---

## Тестирование

### Тестирование API с Postman

1. Импортируйте коллекцию endpoints
2. Установите переменные: {{token}}, {{baseUrl}}
3. Выполняйте запросы в порядке:
   - POST /register
   - POST /login (сохраните токен)
   - POST /upload (с токеном)
   - GET /approved
   - и т.д.

### Тестирование компонентов

```javascript
// Пример с React Testing Library
import { render, screen } from '@testing-library/react';
import { Home } from './pages/Home';

test('renders home page', () => {
  render(<Home />);
  expect(screen.getByText(/GIF/i)).toBeInTheDocument();
});
```

### Тестирование БД запросов

```javascript
// Пример с pg
const client = new Client(dbConfig);
await client.connect();

const result = await client.query('SELECT * FROM users WHERE id = $1', [1]);
console.log(result.rows);

await client.end();
```

---

## Безопасность

### JWT токены
- Хранятся в localStorage (или httpOnly cookies)
- Проверяются на каждом protected endpoint
- Срок действия: 7 дней
- Refresh token: (можно добавить)

### Пароли
- Хешируются с bcryptjs (10 rounds)
- Никогда не хранятся в открытом виде
- Сравниваются с хешем при входе

### SQL Injection
- Используется параметризация запросов ($1, $2, ...)
- Никогда не конкатенируйте значения в SQL

### CORS
- Настроено для разработки (localhost)
- Для production измените на ваш домен

---

## Соглашения кода

### Backend
- Используйте async/await вместо callbacks
- Проверяйте ошибки в try/catch блоках
- Возвращайте правильные HTTP коды (200, 201, 400, 401, 404, 500)
- Используйте snake_case для имен переменных

### Frontend
- Используйте функциональные компоненты с hooks
- Используйте camelCase для имен переменных
- Разделяйте логику на меньшие компоненты
- Используйте CSS modules или BEM для стилей

---

## Debug режим

### Backend

```javascript
// Добавьте DEBUG переменную
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) console.log('Debug info:', data);
```

### Frontend

```javascript
// Используйте React DevTools браузера
// Используйте console.log() для debug
// Используйте debugger; для остановки
```

---

Удачи в разработке!