import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

// Public (rate limited: 5 req/min per IP)
router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);
router.post('/logout', validate({ body: refreshSchema }), authController.logout);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

// Protected
router.put('/profile', authenticate, validate({ body: updateProfileSchema }), authController.updateProfile);

export default router;
