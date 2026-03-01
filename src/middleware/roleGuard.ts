import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

type Role = 'owner' | 'admin' | 'cashier' | 'waiter' | 'kitchen';

/**
 * Middleware that restricts access to specific roles.
 * Must be used after authenticate middleware.
 */
export function roleGuard(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }

    next();
  };
}
