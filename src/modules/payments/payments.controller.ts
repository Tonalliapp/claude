import { Request, Response, NextFunction } from 'express';
import * as paymentsService from './payments.service';
import type { ListPaymentsQuery } from './payments.schema';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await paymentsService.create(req.tenantId!, req.body);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentsService.list(req.tenantId!, req.query as unknown as ListPaymentsQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
