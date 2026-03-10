import { Request, Response, NextFunction } from 'express';
import * as auditService from './audit.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await auditService.listAuditLogs(req.tenantId!, {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      action: req.query.action as string | undefined,
      targetType: req.query.targetType as string | undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
