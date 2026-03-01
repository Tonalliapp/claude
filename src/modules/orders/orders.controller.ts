import { Request, Response, NextFunction } from 'express';
import * as ordersService from './orders.service';
import type { ListQuery } from './orders.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ordersService.list(req.tenantId!, req.query as unknown as ListQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.getById(req.tenantId!, req.params.id as string);
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.create(req.tenantId!, req.body, req.user?.userId);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.updateStatus(req.tenantId!, req.params.id as string, req.body.status);
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.cancelOrder(req.tenantId!, req.params.id as string, req.body.reason);
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function updateItemStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await ordersService.updateItemStatus(
      req.tenantId!,
      req.params.id as string,
      req.params.itemId as string,
      req.body.status,
    );
    res.json(item);
  } catch (error) {
    next(error);
  }
}
