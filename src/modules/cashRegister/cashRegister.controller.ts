import { Request, Response, NextFunction } from 'express';
import * as cashRegisterService from './cashRegister.service';

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
    res.status(201).json(register);
  } catch (error) {
    next(error);
  }
}

export async function close(req: Request, res: Response, next: NextFunction) {
  try {
    const register = await cashRegisterService.close(req.tenantId!, req.body);
    res.json(register);
  } catch (error) {
    next(error);
  }
}
