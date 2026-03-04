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

export async function getYessweraStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await tenantsService.getYessweraStatus(req.tenantId!);
    res.json(status);
  } catch (error) {
    next(error);
  }
}

export async function toggleYesswera(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await tenantsService.toggleYesswera(req.tenantId!, req.body.enabled);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
