import express from 'express';
import { adminMiddleware } from '../middleware/auth.js';
import { getPendingGifs, approveGif, rejectGif, getAllGifs, deletePublishedGif, updatePendingGif } from '../controllers/adminController.js';

const router = express.Router();

router.get('/pending', adminMiddleware, getPendingGifs);
router.post('/approve/:id', adminMiddleware, approveGif);
router.post('/reject/:id', adminMiddleware, rejectGif);
router.delete('/delete/:id', adminMiddleware, deletePublishedGif);
router.put('/pending/:id', adminMiddleware, updatePendingGif);
router.get('/gifs/all', adminMiddleware, getAllGifs);

export default router;