import pg from 'pg';

const { Pool } = pg;

if (!process.env.DB_PASSWORD) {
  console.error('❌ DB_PASSWORD не загружена из .env');
  console.error('Переменные окружения:', {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
  });
  process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD),
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'gifcom',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;