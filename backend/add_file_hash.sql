-- Добавление колонки file_hash для защиты от дубликатов
ALTER TABLE gifs ADD COLUMN file_hash VARCHAR(64);

-- Индекс для быстрого поиска по хешу
CREATE INDEX idx_gifs_file_hash ON gifs(file_hash);

-- Уникальный индекс на file_hash + user_id - один пользователь не может загрузить один и тот же файл дважды