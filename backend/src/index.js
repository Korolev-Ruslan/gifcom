import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);

const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');
envLines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
    process.env[key.trim()] = value.trim();
  }
});

console.log('.env loaded. DB:', process.env.DB_HOST, process.env.DB_NAME);

(async () => {
  const authRoutes = (await import('./routes/auth.js')).default;
  const gifRoutes = (await import('./routes/gifs.js')).default;
  const checkRoutes = (await import('./routes/check.js')).default;
  const adminRoutes = (await import('./routes/admin.js')).default;
  const commentRoutes = (await import('./routes/comments.js')).default;
  const ratingRoutes = (await import('./routes/ratings.js')).default;
  const userRoutes = (await import('./routes/users.js')).default;
  const notificationRoutes = (await import('./routes/notifications.js')).default;
  const favoriteRoutes = (await import('./routes/favorites.js')).default;

  const app = express();
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../uploads')));

  app.use('/api/auth', authRoutes);
  app.use('/api/gifs', gifRoutes);
  app.use('/api/check', checkRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/ratings', ratingRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/favorites', favoriteRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
  });

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
})().catch(err => {
  console.error('Error starting app:', err);
  process.exit(1);
});