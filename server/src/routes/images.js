import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  uploadImage,
  uploadBatch,
  uploadFromUrl,
  getImage,
  getUserImages,
  getUserFolders,
  getUserTags,
  deleteImage,
  renameImage,
  updateImage,
  bulkDeleteImages,
  searchImages,
} from '../controllers/imageController.js';

const router = Router();

router.post('/upload', protect, upload.single('image'), uploadImage);
router.post('/batch-upload', protect, upload.array('images', 20), uploadBatch);
router.post('/upload-url', protect, uploadFromUrl);
router.get('/library', protect, getUserImages);
router.get('/folders', protect, getUserFolders);
router.get('/tags', protect, getUserTags);
router.get('/search', protect, searchImages);
router.post('/bulk-delete', protect, bulkDeleteImages);
router.get('/:imageId', protect, getImage);
router.put('/:imageId/rename', protect, renameImage);
router.patch('/:imageId', protect, updateImage);
router.delete('/:imageId', protect, deleteImage);

export default router;
