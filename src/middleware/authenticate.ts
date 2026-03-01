import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth';
import { AppError } from './errorHandler';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Access token required', 'AUTH_REQUIRED');
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, authConfig.accessToken.secret) as JwtPayload;
    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token', 'TOKEN_INVALID');
  }
}
