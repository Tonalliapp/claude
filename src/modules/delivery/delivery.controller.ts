import { Request, Response, NextFunction } from 'express';
import * as deliveryService from './delivery.service';

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deliveryService.createDeliveryOrder(req.tenantId!, req.body);
    res.status(201).json(result);
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
