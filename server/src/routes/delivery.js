import { Router } from 'express';
import { deliverImage } from '../controllers/deliveryController.js';

const router = Router();

router.get('/:imageId', deliverImage);

export default router;
