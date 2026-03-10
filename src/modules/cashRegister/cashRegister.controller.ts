import { Request, Response, NextFunction } from 'express';
import * as cashRegisterService from './cashRegister.service';
import { logAudit } from '../audit/audit.service';

export async function getCurrent(req: Request, res: Response, next: NextFunction) {
  try {
    const register = await cashRegisterService.getCurrent(req.tenantId!);
    res.json(register);
  } catch (error) {
    next(error);
  }
}

export async function open(req: Request, res: Response, next: NextFunction) {
  try {
    const register = await cashRegisterService.open(req.tenantId!, req.user!.userId, req.body);
    logAudit({
      tenantId: req.tenantId!,
      userId: req.user!.userId,
      action: 'cash_register.open',
      targetType: 'cash_register',
      targetId: register.id,
      details: { openingAmount: req.body.openingAmount },
      ipAddress: req.ip,
    });
    res.status(201).json(register);
  } catch (error) {
    next(error);
  }
}

export async function close(req: Request, res: Response, next: NextFunction) {
  try {
    const register = await cashRegisterService.close(req.tenantId!, req.body);
    logAudit({
      tenantId: req.tenantId!,
      userId: req.user!.userId,
      action: 'cash_register.close',
      targetType: 'cash_register',
      targetId: register.id,
      details: { closingAmount: req.body.closingAmount },
      ipAddress: req.ip,
    });
    res.json(register);
  } catch (error) {
    next(error);
  }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cashRegisterService.history(req.tenantId!, req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cashRegisterService.summary(req.tenantId!, req.params.id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createMovement(req: Request, res: Response, next: NextFunction) {
  try {
    const movement = await cashRegisterService.createMovement(req.tenantId!, req.user!.userId, req.body);
    res.status(201).json(movement);
  } catch (error) {
    next(error);
  }
}

export async function generateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cashRegisterService.generateReport(req.tenantId!, req.params.id as string, req.body.signedBy as string);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
