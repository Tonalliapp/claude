import { Request, Response, NextFunction } from 'express';
import * as adminAuthService from './admin.auth.service';
import * as adminService from './admin.service';
import * as auditService from './audit.service';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminAuthService.superadminLogin(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.getDashboard();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listTenants(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.listTenants(req.query as never);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTenantDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.getTenantDetail(req.params.id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await adminService.updateTenant(id, req.body);
    await auditService.createAuditLog({
      userId: req.user!.userId,
      action: 'tenant.update',
      targetType: 'tenant',
      targetId: id,
      details: req.body,
      ipAddress: req.ip ?? undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await adminService.deleteTenant(id);
    await auditService.createAuditLog({
      userId: req.user!.userId,
      action: 'tenant.delete',
      targetType: 'tenant',
      targetId: id,
      ipAddress: req.ip ?? undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.listAllUsers(req.query as never);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getUserDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.getUserDetail(req.params.id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await adminService.updateUser(id, req.body);
    await auditService.createAuditLog({
      userId: req.user!.userId,
      action: 'user.update',
      targetType: 'user',
      targetId: id,
      details: req.body,
      ipAddress: req.ip ?? undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.listAllOrders(req.query as never);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.getSubscriptionOverview();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await auditService.listAuditLogs(req.query as never);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
