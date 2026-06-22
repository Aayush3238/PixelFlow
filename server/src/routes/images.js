import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { uploadImage, getImage, getUserImages, deleteImage } from '../controllers/imageController.js';

const router = Router();

router.post('/upload', protect, upload.single('image'), uploadImage);
router.get('/library', protect, getUserImages);
router.get('/:imageId', protect, getImage);
router.delete('/:imageId', protect, deleteImage);

export default router;
