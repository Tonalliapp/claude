import { Request, Response, NextFunction } from 'express';
import * as deliveryService from './delivery.service';

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deliveryService.createDeliveryOrder(req.tenantId!, req.body) as any;
    const status = result._isExisting ? 200 : 201;
    const { _isExisting, ...response } = result;
    res.status(status).json(response);
  } catch (error) {
    next(error);
  }
}

export async function getOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deliveryService.getOrderStatus(req.tenantId!, req.params.id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function webhook(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deliveryService.processWebhook(req.tenantId!, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function confirmPickup(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deliveryService.confirmPickup(req.tenantId!, req.params.id as string, req.body.driverCode);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listDebts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deliveryService.listDebts(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDebtsSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deliveryService.getDebtsSummary(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function confirmDebtPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deliveryService.confirmDebtPayment(req.tenantId!, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
