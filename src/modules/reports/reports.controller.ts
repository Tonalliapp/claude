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

export async function paymentBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.paymentBreakdown(req.tenantId!, req.query as unknown as PeriodQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function exportSalesCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await reportsService.exportSalesCsv(req.tenantId!, req.query as unknown as PeriodQuery);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ventas-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
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

export async function productCosts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.productCosts(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function tipsByWaiter(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.tipsByWaiter(req.tenantId!, req.query as unknown as PeriodQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function ingredientConsumption(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.ingredientConsumption(req.tenantId!, req.query as unknown as PeriodQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function prepTimeStats(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.prepTimeStats(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function businessAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.businessAlerts(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
