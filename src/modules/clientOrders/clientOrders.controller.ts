import { Request, Response, NextFunction } from 'express';
import * as clientOrdersService from './clientOrders.service';

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await clientOrdersService.createClientOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await clientOrdersService.getClientOrder(req.params.id as string);
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function requestBill(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await clientOrdersService.requestBill(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function callWaiter(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await clientOrdersService.callWaiter(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
