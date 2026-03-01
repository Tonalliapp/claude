import { Request, Response, NextFunction } from 'express';
import * as inventoryService from './inventory.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const inventory = await inventoryService.list(req.tenantId!);
    res.json(inventory);
  } catch (error) {
    next(error);
  }
}

export async function upsert(req: Request, res: Response, next: NextFunction) {
  try {
    const inventory = await inventoryService.upsert(
      req.tenantId!,
      req.params.productId as string,
      req.body,
    );
    res.json(inventory);
  } catch (error) {
    next(error);
  }
}

export async function addMovement(req: Request, res: Response, next: NextFunction) {
  try {
    const movement = await inventoryService.addMovement(
      req.tenantId!,
      req.params.productId as string,
      req.body,
      req.user!.userId,
    );
    res.status(201).json(movement);
  } catch (error) {
    next(error);
  }
}

export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const alerts = await inventoryService.getAlerts(req.tenantId!);
    res.json(alerts);
  } catch (error) {
    next(error);
  }
}
