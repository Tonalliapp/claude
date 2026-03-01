import { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';
import type { PeriodQuery, TopProductsQuery } from './reports.schema';

export async function sales(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.salesByPeriod(req.tenantId!, req.query as unknown as PeriodQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function topProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.topProducts(req.tenantId!, req.query as unknown as TopProductsQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function byWaiter(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.salesByWaiter(req.tenantId!, req.query as unknown as PeriodQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.dashboard(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
