import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { getDashboard } from '../controllers/analyticsController.js';

const router = Router();

router.get('/stats', protect, getDashboard);

export default router;
