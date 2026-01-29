# DEPLOYMENT.md - Развертывание и тестирование

Руководство по развертыванию GIFCOM, тестированию и решению проблем.

---

## Содержание

1. [Локальное тестирование](#локальное-тестирование)
2. [Развертывание на Production](#развертывание-на-production)
3. [Решение проблем](#решение-проблем)

---

## Локальное тестирование

### Полный чек-лист функций

#### 1. Регистрация и аутентификация
- Регистрация нового пользователя (username, email, password)
- Вход с правильными учетными данными
- Ошибка при вводе неверного пароля
- Ошибка при регистрации с существующим email
- Ошибка при попытке загрузить без авторизации (403)

#### 2. Загрузка GIF-ок с тегами
- Загрузить GIF с названием, описанием и тегами
- GIF появляется со статусом "Ожидает проверки"
- Невозможно загрузить без названия или файла
- Теги сохраняются корректно
- Несколько GIF-ок загружаются с разными тегами

#### 3. Модерация администратором
- Сделать пользователя админом: `UPDATE users SET role = 'admin' WHERE username = '...'`
- Кнопка "Администрирование" появляется в меню
- Видны все GIF-ки на проверку
- Кнопка "Одобрить" устанавливает status='approved'
- Кнопка "Отклонить" удаляет GIF-ку
- Одобренные GIF видны на главной

#### 4. Главная страница
- Чистая сетка GIF-ок без подписей (только картинки)
- Hover эффект на картинках
- Только одобренные GIF видны
- Несколько столбцов (адаптивный дизайн)

#### 5. Поиск по названию
- Поле поиска на главной
- Поиск фильтрует в реальном времени
- Результаты обновляются при вводе
- Случай-независимый поиск работает

#### 6. Фильтрация по тегам
- Список всех тегов отображается под поиском
- Клик на тег фильтрует GIF-ки
- Кнопка "Все" возвращает полный список
- Несколько тегов могут быть отфильтрованы

#### 7. Страница GIF-ки
- Клик на картинку открывает страницу GIF-ки
- URL изменяется на `/gif/:id`
- Большой просмотр GIF-ки
- Название, описание, автор видны
- Теги отображаются как ссылки

#### 8. Эмоджи реакции
- 5 кнопок эмоджи видны: 😀 😍 🤣 😢 😡
- Клик на эмоджи подсвечивает кнопку
- Счетчик увеличивается при клике
- Только одна реакция на пользователя
- При клике на другую эмоджи - первая потухает
- Ошибка если не авторизован

#### 9. Комментарии
- Поле для комментария видно на странице GIF-ки
- Можно добавить комментарий (авторизованный пользователь)
- Комментарий появляется в списке сразу
- Видны имя автора и текст комментария
- Ошибка если не авторизован

#### 10. Подписка на автора
- Кнопка подписки рядом с именем автора
- Клик добавляет подписку
- Кнопка меняется на "Подписан"
- Клик снова отписывает от автора
- Счетчик подписчиков увеличивается
- Нет кнопки подписки на собственные GIF-ки

#### 11. Канал пользователя
- Клик на имя автора открывает `/channel/:username`
- Показано имя пользователя и аватар
- Счетчик GIF-ок правильный
- Счетчик подписчиков правильный
- Видны все GIF-ки пользователя в сетке
- Можно подписаться/отписаться с канала

#### 12. Скачивание
- Кнопка "Скачать GIF" на странице GIF-ки
- GIF загружается на компьютер
- Может скачивать и без авторизации
- Имя файла правильное

### Тестирование БД данных

```sql
-- Проверьте содержимое таблиц

SELECT * FROM users;
-- id | username | email | password | role | created_at

SELECT g.id, g.title, u.username, g.status 
FROM gifs g 
JOIN users u ON g.user_id = u.id;
-- Должны быть GIF-ки разных пользователей

SELECT * FROM tags;
-- id | name | created_at

SELECT gt.gif_id, gt.tag_id, g.title, t.name
FROM gif_tags gt
JOIN gifs g ON gt.gif_id = g.id
JOIN tags t ON gt.tag_id = t.id;
-- Связь GIF-ок и тегов

SELECT r.gif_id, r.reaction, COUNT(*) as count
FROM ratings r
GROUP BY r.gif_id, r.reaction;
-- Реакции по GIF-кам

SELECT s.follower_id, s.following_id, u1.username, u2.username
FROM subscriptions s
JOIN users u1 ON s.follower_id = u1.id
JOIN users u2 ON s.following_id = u2.id;
-- Подписки пользователей
```

---

## Развертывание на Production

### Вариант 1: DigitalOcean (рекомендуется для начала)

#### Шаг 1: Создать Droplet

На DigitalOcean:
1. Нажать "Create Droplet"
2. OS: Ubuntu 20.04 LTS
3. Size: $6/месяц (2GB RAM, 1 CPU)
4. Region: выбрать ближайший
5. Authentication: SSH keys (или пароль)
6. Создать

#### Шаг 2: Подключиться и обновить систему

```bash
ssh root@ВАШ_IP

# Обновить пакеты
apt update && apt upgrade -y

# Установить Node.js 16
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
apt install -y nodejs

# Установить PostgreSQL
apt install -y postgresql postgresql-contrib

# Установить Nginx
apt install -y nginx

# Установить PM2 (менеджер процессов)
npm install -g pm2

# Установить Certbot для HTTPS
apt install -y certbot python3-certbot-nginx
```

#### Шаг 3: Настроить PostgreSQL

```bash
sudo -u postgres psql

-- В PostgreSQL консоли:
CREATE DATABASE gifcom;
CREATE USER gifcom_user WITH PASSWORD 'ваш_сложный_пароль';
GRANT ALL PRIVILEGES ON DATABASE gifcom TO gifcom_user;
\q
```

#### Шаг 4: Загрузить код проекта

```bash
cd /home
mkdir -p apps
cd apps

# Вариант A: клонировать из GitHub
git clone https://github.com/ваш_юзер/gifcom.git

# Вариант B: скопировать локально (с вашей машины)
# scp -r ./gifcom root@ВАШ_IP:/home/apps/
```

#### Шаг 5: Настроить Backend

```bash
cd /home/apps/gifcom/backend

npm install

# Создать .env
nano .env

# Содержимое .env:
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gifcom
DB_USER=gifcom_user
DB_PASSWORD=ваш_сложный_пароль
JWT_SECRET=генерируемый_секретный_ключ_64_символа
CORS_ORIGIN=https://ваш_домен.com

# Нажать Ctrl+X, Y, Enter для сохранения
```

#### Шаг 6: Импортировать БД

```bash
cd /home/apps/gifcom/backend

sudo -u postgres psql gifcom < database.sql
```

#### Шаг 7: Собрать Frontend

```bash
cd /home/apps/gifcom/frontend

npm install

# Создать .env.production
echo "VITE_API_URL=https://ваш_домен.com/api" > .env.production

npm run build
```

#### Шаг 8: Настроить Nginx

```bash
cat > /etc/nginx/sites-available/gifcom << 'EOF'
server {
    listen 80;
    server_name ваш_домен.com www.ваш_домен.com;

    # Перенаправить на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ваш_домен.com www.ваш_домен.com;

    # SSL сертификаты (после Certbot)
    ssl_certificate /etc/letsencrypt/live/ваш_домен.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ваш_домен.com/privkey.pem;

    # Frontend
    root /home/apps/gifcom/frontend/dist;
    index index.html;

    # React Router - все запросы на index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Статические файлы - кэш
    location ~* \.(js|css|png|jpg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip сжатие
    gzip on;
    gzip_types text/plain text/css application/javascript;
    gzip_min_length 1000;
}
EOF

# Активировать конфиг
ln -s /etc/nginx/sites-available/gifcom /etc/nginx/sites-enabled/

# Проверить синтаксис
nginx -t

# Перезагрузить Nginx
systemctl restart nginx
```

#### Шаг 9: Получить SSL сертификат

```bash
certbot --nginx -d ваш_домен.com -d www.ваш_домен.com

# Выбрать: Redirect (2)
# Автоматическое обновление:
systemctl enable certbot.timer
```

#### Шаг 10: Запустить Backend с PM2

```bash
cd /home/apps/gifcom/backend

# Запустить приложение
pm2 start npm --name "gifcom-api" -- start

# Сохранить список приложений
pm2 save

# Запуск при перезагрузке сервера
pm2 startup
```

#### Шаг 11: Проверить логи

```bash
# Логи backend
pm2 logs gifcom-api

# Логи Nginx
tail -f /var/log/nginx/error.log

# Проверить процессы
pm2 status
```

#### Шаг 12: Открыть порты брандмауэра

```bash
# Если используется UFW
ufw enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
```

#### Готово!

Ваше приложение доступно по адресу: **https://ваш_домен.com**

---

### Вариант 2: Heroku (простое развертывание)

#### Шаг 1: Установить Heroku CLI

```bash
curl https://cli-assets.heroku.com/install.sh | sh

heroku login
```

#### Шаг 2: Создать приложения

```bash
# Backend
heroku create ваше-приложение-api

# Frontend (опционально)
heroku create ваше-приложение-web
```

#### Шаг 3: Добавить PostgreSQL

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

#### Шаг 4: Настроить переменные окружения

```bash
heroku config:set \
  JWT_SECRET=генерируемый_секретный_ключ \
  NODE_ENV=production
```

#### Шаг 5: Развернуть

```bash
cd backend
git push heroku main

# Создать таблицы
heroku run "psql < database.sql"
```

---

### Вариант 3: Docker Compose

Создайте `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: gifcom
      POSTGRES_USER: gifcom_user
      POSTGRES_PASSWORD: password
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: gifcom
      DB_USER: gifcom_user
      DB_PASSWORD: password
      JWT_SECRET: your_secret_here
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:5000/api

volumes:
  db_data:
```

Запуск:

```bash
docker-compose up -d
```

---

## Решение проблем

### Backend

#### Проблема: `EADDRINUSE: address already in use :::5000`

```bash
# Найти процесс
lsof -i :5000

# Убить процесс
kill -9 PID

# Или запустить на другом порту
PORT=5001 npm start
```

#### Проблема: `ECONNREFUSED 127.0.0.1:5432` (PostgreSQL не работает)

```bash
# Проверить статус
sudo systemctl status postgresql

# Запустить
sudo systemctl start postgresql

# Проверить подключение
psql -U postgres -c "SELECT version();"
```

#### Проблема: `password authentication failed`

```sql
-- Сбросить пароль
sudo -u postgres psql
ALTER USER gifcom_user WITH PASSWORD 'новый_пароль';
```

#### Проблема: `database "gifcom" does not exist`

```bash
# Создать БД
sudo -u postgres createdb gifcom

# Импортировать
sudo -u postgres psql gifcom < backend/database.sql
```

### Frontend

#### Проблема: CORS ошибка

```javascript
// backend/src/index.js

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
```

#### Проблема: Изображения 404

```javascript
// backend/src/index.js
app.use('/uploads', express.static('uploads'));
```

#### Проблема: `VITE_API_URL is not defined`

```bash
# frontend/.env.development или .env.production
VITE_API_URL=http://localhost:5000/api
```

### Аутентификация

#### Проблема: `jwt malformed`

```bash
# Очистить localStorage и переавторизоваться
# Открыть DevTools -> Application -> Local Storage
# Удалить "token" и "user"
```

#### Проблема: `403 Forbidden` при загрузке

Токен истек или отсутствует. Переавторизуйтесь.

### Database

#### Проблема: `UNIQUE constraint failed`

```bash
# Проверить дубли
sudo -u postgres psql gifcom
SELECT * FROM users WHERE username = 'duplicate';

# Удалить
DELETE FROM users WHERE username = 'duplicate';
```

---

## Мониторинг Production

### Проверить статус приложений (PM2)

```bash
pm2 status
pm2 logs gifcom-api
pm2 restart gifcom-api
pm2 stop gifcom-api
```

### Проверить статус процессов

```bash
# Все процессы Node.js
ps aux | grep node

# Использование памяти
free -h

# Дисковое пространство
df -h

# CPU
top
```

### Резервные копии БД

```bash
# Создать бэкап
pg_dump gifcom > backup_$(date +%Y%m%d).sql

# Восстановить
psql gifcom < backup.sql
```

### Логирование

```bash
# Nginx ошибки
tail -f /var/log/nginx/error.log

# Nginx доступ
tail -f /var/log/nginx/access.log

# PostgreSQL
tail -f /var/log/postgresql/*.log

# PM2 приложение
pm2 logs gifcom-api --lines 100
```

---

Ваше приложение готово!