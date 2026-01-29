# GIFCOM - Платформа для обмена GIF

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%3E%3D12-blue.svg)](https://www.postgresql.org/)

Платформа для обмена GIF-изображениями с системой модерации, реакциями, комментариями и пользовательскими каналами.

---

## Требования

| Требование | Минимальная версия |
|------------|-------------------|
| Node.js    | 16+              |
| PostgreSQL | 12+              |
| npm/yarn   | последняя        |

---

## Установка и запуск

### 1. Подготовка базы данных

```bash
psql -U postgres -f backend/database.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Отредактируйте .env (DB_PASSWORD, JWT_SECRET)
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Первый запуск

1. Зарегистрируйте нового пользователя
2. Станьте администратором через SQL:
   ```sql
   UPDATE users SET role = 'admin' WHERE username = 'ваше_имя';
   ```
3. Загрузите GIF и одобрите её в админ-панели

### 5. Откройте http://localhost:3000

---

## Основные функции

### Загрузка GIF

- Загрузка с названием, описанием и тегами
- Модерация администратором перед публикацией
- Поддержка файлов до 50 МБ

### Поиск и фильтры

| Функция | Описание |
|---------|----------|
| Поиск | Поиск по названию в реальном времени |
| Теги | Фильтрация по тегам |
| Динамика | Мгновенные результаты при вводе |

### Реакции

Оценка GIF-изображений с помощью эмоджи: 😀 😍 🤣 😢 😡

- Одна реакция на пользователя
- Защита от накрутки
- Отображение всех реакций

### Каналы пользователей

Публичные профили с историей всех GIF-ок и статистикой подписчиков.

### Система подписок

- Подписка на авторов
- Отслеживание нового контента
- Видны все подписчики автора

### Комментарии

- Только для авторизованных пользователей
- Хронологический порядок отображения

### Скачивание

- Скачивание одобренных GIF (без регистрации)
- Прямые ссылки для быстрой загрузки

---

## Структура проекта

```
gifcom/
├── backend/              # Backend (Express + PostgreSQL)
│   ├── src/
│   │   ├── controllers/  # Бизнес-логика
│   │   ├── models/       # Модели БД
│   │   ├── routes/       # API маршруты
│   │   ├── middleware/   # Аутентификация
│   │   └── utils/        # Утилиты
│   ├── uploads/          # Загруженные GIF-ки
│   ├── database.sql      # Схема БД
│   └── package.json
│
├── frontend/             # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/   # React компоненты
│   │   ├── pages/        # Страницы
│   │   ├── api/          # API клиент
│   │   ├── context/      # React контекст
│   │   ├── styles/       # CSS стили
│   │   └── hooks/        # Хуки
│   └── package.json
│
├── telegram-bot/         # Telegram бот (опционально)
│   ├── src/
│   │   ├── handlers/     # Обработчики
│   │   └── utils/        # Утилиты
│   └── package.json
│
├── README.md             # Документация
├── DEVELOPMENT.md        # Для разработчиков
├── DEPLOYMENT.md         # Развертывание
├── TELEGRAM_BOT.md       # Telegram бот
└── ROADMAP.md            # План развития
```

---

## Архитектура

### Технологический стек

| Уровень | Технологии |
|---------|------------|
| Frontend | React 18, React Router v6, Vite, Axios |
| Backend | Express.js, Node.js, Multer |
| Database | PostgreSQL, JWT Authentication |

### Поток данных

| Операция | Поток |
|----------|-------|
| Загрузка GIF | Форма → POST /gifs/upload → Сохранение → DB INSERT → Модерация |
| Модерация | AdminPanel → POST /admin/approve/:id → DB UPDATE → Публикация |
| Просмотр | Home → Клик → GifDetail → Реакция → DB INSERT |
| Подписка | Профиль → Кнопка → POST /subscribe → DB INSERT |

---

## API Endpoints

### Аутентификация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |

### GIF

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | /api/gifs/approved | Одобренные GIF |
| GET | /api/gifs/search | Поиск по названию/тегам |
| POST | /api/gifs/upload | Загрузить GIF (токен) |
| GET | /api/gifs/:id | Информация о GIF |
| GET | /api/gifs/:id/download | Скачать GIF |
| GET | /api/gifs/channel/:username | Все GIF пользователя |

### Реакции

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | /api/ratings/:gifId | Добавить реакцию (токен) |
| GET | /api/ratings/:gifId | Все реакции |
| GET | /api/ratings/:gifId/user-reaction | Ваша реакция (токен) |

### Комментарии

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | /api/comments/:gifId | Добавить (токен) |
| GET | /api/comments/:gifId | Получить |

### Подписки

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | /api/users/:userId/subscribe | Подписаться (токен) |
| DELETE | /api/users/:userId/unsubscribe | Отписаться (токен) |
| GET | /api/users/:userId/is-subscribed | Проверить подписку |
| GET | /api/users/:username | Профиль |

### Администрирование

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | /api/admin/pending | На проверку |
| POST | /api/admin/approve/:id | Одобрить |
| POST | /api/admin/reject/:id | Отклонить |

---

## Конфигурация

### Backend (.env)

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gifcom
DB_USER=postgres
DB_PASSWORD=ваш_пароль

JWT_SECRET=ваш_секретный_ключ
JWT_EXPIRES_IN=7d

NODE_ENV=development
PORT=3000
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:3000/api
```

---

## Решение проблем

### Ошибка подключения к БД

1. PostgreSQL запущена
2. Проверьте данные в .env
3. База создана: `CREATE DATABASE gifcom;`
4. Пользователь postgres существует

### 404 при загрузке GIF

1. Папка `backend/uploads/` существует
2. Backend запущен
3. GIF одобрена в админ-панели
4. Перезагрузите страницу (F5)

### Нет кнопки "Администрирование"

1. Выполнен SQL UPDATE для админа
2. Страница перезагружена
3. Пользователь вышел и вошёл заново

### GIF в админ-панели, но не на главной

1. Статус: `status = 'approved'`
2. Нажата кнопка "Одобрить"
3. Главная перезагружена (F5)

---

## Развертывание

Подробные инструкции в [DEPLOYMENT.md](DEPLOYMENT.md):

- VPS (DigitalOcean, Linode, AWS)
- Docker и Docker Compose
- Heroku
- Kubernetes

---

## Telegram Бот (опционально)

Возможности:

- Загрузка GIF через Telegram
- Встроенный Web App
- Быстрый поиск из чата

Подробности в [TELEGRAM_BOT.md](TELEGRAM_BOT.md)

---

## Разработка

Документация для разработчиков: [DEVELOPMENT.md](DEVELOPMENT.md)

Команда для разработки:

```bash
npm run dev  # hot reload
```

---

## Статус версий

### v1.0 (ЗАВЕРШЕНО)
- Загрузка GIF-ок
- Оценка звездами (1-5)
- Комментарии
- Регистрация/вход
- Админ панель (модерация)
- Скачивание GIF-ок

### v2.0 (ЗАВЕРШЕНО)
- Эмоджи реакции (вместо звезд)
- Система тегов (поиск + фильтр)
- Пользовательские каналы (как YouTube)
- Подписки на авторов
- Главная с рекомендациями
- Поиск по названию + тегам
- JWT Authentication для всех операций

### Telegram Bot
- Загрузка GIF через бота
- Встроенное веб-приложение (Web App)
- Поддержка видео файлов

## Технологический стек

### Frontend
- React 18 - UI компоненты
- React Router v6 - маршрутизация
- Vite - сборка и dev сервер
- Axios - HTTP клиент
- CSS3 - стили (flexbox, grid, animations)

### Backend
- Express.js - веб фреймворк
- Node.js - рантайм
- PostgreSQL - база данных
- JWT - аутентификация
- Multer - загрузка файлов
- bcryptjs - хеширование паролей

### DevOps
- Nginx - reverse proxy
- PM2 - процесс менеджер
- Docker - контейнеризация (опционально)
- Let's Encrypt - SSL сертификаты
- PostgreSQL backups - резервные копии

## Безопасность

### Network Level
- HTTPS/SSL encryption
- CORS policy enforcement
- Rate limiting (planned)
- DDoS protection (planned)

### Application Level
- JWT token authentication
- Password hashing (bcryptjs)
- SQL parameterization
- Input validation
- File type validation
- XSS prevention (improvement planned)

### Database Level
- User roles (user/admin)
- Foreign key constraints
- Row-level security (planned)
- Data encryption at rest (planned)
- Regular backups

### Development
- `npm start` + `npm run dev`
- localStorage for state
- PostgreSQL locally
- http://localhost:3000

## Roadmap

### Запланированные улучшения
- Шифрование данных пользователей
- Улучшенное сжатие GIF
- Кэширование на уровне бота
- Статистика использования
- Admin panel для управления ботом

## FAQ

### Как сделать пользователя администратором?

```sql
UPDATE users SET role = 'admin' WHERE username = 'username';
```

### Где хранятся загруженные GIF?

```
backend/uploads/
```

### Как изменить пароль в БД?

Нельзя изменить напрямую. Используйте механизм восстановления пароля.

### Можно ли использовать S3?

Да, замените multer на aws-sdk в `gifController.js`

### Как тестировать API?

Используйте Postman с endpoints из документации выше.

## Обучение

Этот проект может быть использован для изучения:

1. React - современная разработка UI
2. Node.js - backend разработка
3. Express.js - веб фреймворки
4. PostgreSQL - реляционные БД
5. JWT - аутентификация
6. REST API - API дизайн
7. Nginx - веб серверы
8. Docker - контейнеризация
9. DevOps - развертывание
10. Git - контроль версий