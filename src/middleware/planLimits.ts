import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { PLAN_CONFIG } from '../config/stripe';
import { AppError } from './errorHandler';

type Resource = 'tables' | 'users' | 'products';
type PlanFeature = (typeof PLAN_CONFIG)[keyof typeof PLAN_CONFIG]['features'][number];

const RESOURCE_CONFIG: Record<Resource, { maxField: 'maxTables' | 'maxUsers' | 'maxProducts'; label: string }> = {
  tables: { maxField: 'maxTables', label: 'mesas' },
  users: { maxField: 'maxUsers', label: 'usuarios' },
  products: { maxField: 'maxProducts', label: 'productos' },
};

export function checkPlanLimit(resource: Resource) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const config = RESOURCE_CONFIG[resource];

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { [config.maxField]: true },
      });

      if (!tenant) return next(new AppError(404, 'Tenant no encontrado', 'NOT_FOUND'));

      const max = (tenant as unknown as Record<string, number>)[config.maxField];

      // Count current active resources
      let count: number;
      switch (resource) {
        case 'tables':
          count = await prisma.table.count({ where: { tenantId, active: true } });
          break;
        case 'users':
          count = await prisma.user.count({ where: { tenantId, active: true } });
          break;
        case 'products':
          count = await prisma.product.count({ where: { tenantId } });
          break;
      }

      if (count >= max) {
        return next(
          new AppError(
            403,
            `Has alcanzado el límite de ${max} ${config.label} en tu plan. Mejora tu plan para agregar más.`,
            'PLAN_LIMIT_REACHED',
          ),
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware that checks if the tenant's plan includes a specific feature.
 * Features are defined in PLAN_CONFIG (stripe.ts).
 */
export function checkFeature(feature: PlanFeature) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true },
      });

      if (!tenant) return next(new AppError(404, 'Tenant no encontrado', 'NOT_FOUND'));

      const planFeatures = PLAN_CONFIG[tenant.plan]?.features ?? [];

      if (!(planFeatures as readonly string[]).includes(feature)) {
        return next(
          new AppError(
            403,
            `Esta función no está disponible en tu plan actual. Mejora tu plan para acceder.`,
            'FEATURE_NOT_AVAILABLE',
          ),
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
