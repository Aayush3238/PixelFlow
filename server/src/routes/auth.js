import { Router } from 'express';
import passport from 'passport';
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
  googleCallback,
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

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=auth_failed' }),
  googleCallback
);

export default router;
