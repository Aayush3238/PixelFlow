import { Router } from 'express';
import { deliverImage, getImageMeta } from '../controllers/deliveryController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/:imageId/meta', rateLimiter, getImageMeta);
router.get('/:imageId', rateLimiter, deliverImage);

export default router;
