import { Request, Response, NextFunction } from 'express';
import * as menuService from './menu.service';

export async function getMenu(req: Request, res: Response, next: NextFunction) {
  try {
    const menu = await menuService.getMenuBySlug(req.params.slug as string);
    res.json(menu);
  } catch (error) {
    next(error);
  }
}

export async function getTableInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const tableNumber = parseInt(req.params.number as string, 10);
    if (isNaN(tableNumber)) {
      res.status(400).json({ error: { message: 'Número de mesa inválido', code: 'INVALID_TABLE' } });
      return;
    }
    const info = await menuService.getTableInfo(req.params.slug as string, tableNumber);
    res.json(info);
  } catch (error) {
    next(error);
  }
}
