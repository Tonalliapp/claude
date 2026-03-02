import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export function superadminGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  if (req.user.role !== 'superadmin') {
    throw new AppError(403, 'Superadmin access required', 'FORBIDDEN');
  }

  next();
}
