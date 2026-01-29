# GIFcom Telegram Bot

Telegram-бот для загрузки и обмена GIF-файлами на платформе GIFcom.

## Возможности

- Загрузка GIF прямо в боте - отправьте GIF или видео боту, и оно автоматически загрузится на сайт
- Web App в Telegram - откройте полный функционал сайта прямо в Telegram
- Мгновенные ссылки - получите ссылку на загруженный GIF для отправки друзьям
- Удобный интерфейс - интуитивное управление прямо из мессенджера
- Автоматическое сохранение - все GIF автоматически сохраняются в базе данных
- Отслеживание пользователей - интеграция с системой пользователей GIFcom

## Требования

- Node.js 16 или выше
- npm или yarn
- Telegram Bot Token (получить от @BotFather)
- Backend GIFcom запущен на http://localhost:3000
- Frontend GIFcom запущен на http://localhost:5173

## Быстрый старт

### 1. Получить Bot Token

Откройте Telegram и найдите @BotFather, напишите /newbot и следуйте инструкциям. Скопируйте полученный токен.

### 2. Установить зависимости

```bash
cd telegram-bot
npm install
```

### 3. Настроить окружение

Создайте .env файл:

```bash
cp .env.example .env
```

Содержимое .env:

```env
TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE
BACKEND_URL=http://localhost:3000/api
WEB_APP_URL=http://localhost:5173/web-app
BOT_PORT=3001
```

### 4. Запустить бота

```bash
npm start
```

Вы должны увидеть:

```
Telegram бот запущен!
Bot token: 123456...
```

### 5. Тестирование

1. Откройте Telegram
2. Найдите вашего бота (по username)
3. Отправьте /start
4. Отправьте GIF файл
5. Должна появиться ссылка на загруженный файл

## Структура проекта

```
telegram-bot/
├── src/
│   ├── index.js              # Главный файл бота
│   ├── handlers/
│   │   ├── start.js          # Обработчик /start команды
│   │   ├── gifUpload.js      # Загрузка GIF файлов
│   │   └── webApp.js         # Web App обработчик
│   └── utils/
│       └── (утилиты)
├── temp/                     # Временные файлы
├── .env                      # Переменные окружения
├── package.json              # Зависимости
└── README.md                 # Этот файл
```

## Расширенная конфигурация

### Использование Webhook вместо Polling (production)

По умолчанию бот использует polling (проверка обновлений). Для production рекомендуется webhook:

```javascript
// src/index.js
const WEBHOOK_URL = process.env.WEBHOOK_URL;
bot.telegram.setWebhook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);
bot.startWebhook(`/bot${BOT_TOKEN}`, null, BOT_PORT);
```

### Настройка Telegram Bot Menu Button

В @BotFather:
```
/setmenubutton
(выберите бота)
(введите URL: http://localhost:5173/web-app)
```

## Интеграция с Backend

### API Endpoints

#### Загрузка от бота

```http
POST /api/gifs/upload-bot
X-Bot-Token: telegram_bot_token
X-Telegram-User-Id: 123456789

Content-Type: multipart/form-data
gif: [файл]
```

#### Загрузка как гость

```http
POST /api/gifs/upload-guest

Content-Type: multipart/form-data
gif: [файл]
```

### Database Миграция

Запустите SQL миграцию:

```bash
cd ../backend/migrations
psql -U user -d gifcom -f 001_telegram_bot_support.sql
```

Или вручную в PostgreSQL:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_bot_user BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

ALTER TABLE gifs ADD COLUMN IF NOT EXISTS is_bot_upload BOOLEAN DEFAULT FALSE;
ALTER TABLE gifs ADD COLUMN IF NOT EXISTS is_guest_upload BOOLEAN DEFAULT FALSE;
ALTER TABLE gifs ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
```

## Разработка

### Запуск в режиме разработки

```bash
npm run dev
```

Будет использован nodemon для автоматической перезагрузки.

### Логирование

Бот выводит логи всех действий:

```
Username (123456): /start
Web App Data: {...}
Error: описание
Success: описание
```

### Добавление новой команды

```javascript
// src/handlers/myCommand.js
export const myCommandHandler = (ctx) => {
  ctx.reply('Привет!');
};

// src/index.js
import { myCommandHandler } from './handlers/myCommand.js';
bot.command('mycommand', myCommandHandler);
```

## Troubleshooting

### Ошибка: "TELEGRAM_BOT_TOKEN не установлен"

```bash
# Проверить .env файл
cat .env | grep TELEGRAM_BOT_TOKEN

# Убедиться что токен скопирован правильно
# Перезапустить бота
npm start
```

### Ошибка: "Cannot connect to backend"

```bash
# Проверить что backend запущен
curl http://localhost:3000/api/gifs/approved

# Проверить BACKEND_URL в .env
# Может быть неправильный адрес или порт

# Проверить firewall
```

### Ошибка при загрузке GIF

- Проверить размер файла (макс 100MB)
- Проверить что это действительно GIF
- Посмотреть логи бота для деталей ошибки

### Web App не открывается

- Убедитесь что frontend запущен на http://localhost:5173
- На production используйте HTTPS
- Проверьте URL в WEB_APP_URL

## Полезные ссылки

- Telegraf Documentation: https://telegraf.js.org/
- Telegram Bot API: https://core.telegram.org/bots/api
- @BotFather: https://t.me/botfather - Создание бота
- Telegram Web App: https://core.telegram.org/bots/webapps