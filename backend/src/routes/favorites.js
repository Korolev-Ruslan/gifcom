import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { addFavorite, removeFavorite, getFavorites, checkFavorite } from '../controllers/favoriteController.js';

const router = express.Router();

router.post('/:gifId', authMiddleware, addFavorite);
router.delete('/:gifId', authMiddleware, removeFavorite);
router.get('/', authMiddleware, getFavorites);
router.get('/:gifId/check', authMiddleware, checkFavorite);

export default router;