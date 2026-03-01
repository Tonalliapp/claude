import { Request, Response, NextFunction } from 'express';
import * as tenantsService from './tenants.service';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await tenantsService.getMyTenant(req.tenantId!);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await tenantsService.updateMyTenant(req.tenantId!, req.body);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
}

export async function uploadLogo(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { message: 'Imagen requerida', code: 'FILE_REQUIRED' } });
      return;
    }
    const tenant = await tenantsService.uploadLogo(req.tenantId!, req.file.buffer);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
}
