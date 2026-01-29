-- Миграция для поддержки Telegram Bot
-- Выполнить эти команды в PostgreSQL

-- 1. Добавить колонки в таблицу users для поддержки Telegram пользователей
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_bot_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- 2. Добавить индекс для быстрого поиска по telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- 3. Добавить колонки в таблицу gifs для отслеживания загрузок от бота
ALTER TABLE gifs 
ADD COLUMN IF NOT EXISTS is_bot_upload BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_guest_upload BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

-- 4. Добавить индекс для быстрого поиска GIF по telegram_id
CREATE INDEX IF NOT EXISTS idx_gifs_telegram_id ON gifs(telegram_id);

-- 5. Добавить комментарии для документации
COMMENT ON COLUMN users.is_bot_user IS 'Флаг для пользователей, созданных через Telegram бот';
COMMENT ON COLUMN users.telegram_id IS 'Telegram User ID для связи аккаунта';
COMMENT ON COLUMN gifs.is_bot_upload IS 'Флаг для GIF загруженных через Telegram бот';
COMMENT ON COLUMN gifs.is_guest_upload IS 'Флаг для GIF загруженных как гость';
COMMENT ON COLUMN gifs.telegram_id IS 'Telegram User ID того, кто загрузил GIF';

-- 6. Проверить изменения
\d users;
\d gifs;
