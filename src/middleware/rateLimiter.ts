import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Global API limiter — 100 req/min per IP
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMITED',
    },
  },
});

// Auth limiter — 5 req/min (login, register, forgot-password, reset-password)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Demasiados intentos. Espera un minuto e intenta de nuevo.',
      code: 'AUTH_RATE_LIMITED',
    },
  },
});

// Client orders limiter — 20 req/min per IP (public, no auth)
export const clientOrdersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Demasiadas solicitudes. Intenta en un momento.',
      code: 'CLIENT_RATE_LIMITED',
    },
  },
});

// Public menu limiter — 60 req/min per IP
export const menuLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Demasiadas solicitudes.',
      code: 'MENU_RATE_LIMITED',
    },
  },
});
