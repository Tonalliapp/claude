import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

/**
 * Resolves tenant from JWT (already set by authenticate middleware)
 * or from :slug param for public routes.
 */
export function tenantFromAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.tenantId) {
    throw new AppError(401, 'Tenant context required', 'TENANT_REQUIRED');
  }
  next();
}

/**
 * Resolves tenant from URL slug for public endpoints (menu).
 */
export function tenantFromSlug() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = req.params.slug as string;
      if (!slug) {
        throw new AppError(400, 'Restaurant slug required', 'SLUG_REQUIRED');
      }

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });

      if (!tenant) {
        throw new AppError(404, 'Restaurant not found', 'TENANT_NOT_FOUND');
      }

      if (tenant.status !== 'active') {
        throw new AppError(403, 'Restaurant is not active', 'TENANT_INACTIVE');
      }

      req.tenantId = tenant.id;
      next();
    } catch (error) {
      next(error);
    }
  };
}
