import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/authenticate';
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

// Public
router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);
router.post('/logout', validate({ body: refreshSchema }), authController.logout);
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordSchema }), authController.resetPassword);

// Protected
router.put('/profile', authenticate, validate({ body: updateProfileSchema }), authController.updateProfile);

export default router;
