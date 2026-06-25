import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  deleteAccount,
  refresh,
  createApiKey,
  listApiKeys,
  deleteApiKey,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[a-z]/)
      .withMessage('Password must contain a lowercase letter')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain a number'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.get('/me', protect, getMe);
router.post('/refresh', refresh);
router.get('/api-keys', protect, listApiKeys);
router.post('/api-keys', protect, createApiKey);
router.delete('/api-keys/:keyId', protect, deleteApiKey);
router.delete('/account', protect, deleteAccount);

export default router;
