import { Request, Response, NextFunction } from 'express';
import * as categoriesService from './categories.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await categoriesService.list(req.tenantId!);
    res.json(categories);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoriesService.create(req.tenantId!, req.body);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoriesService.update(req.tenantId!, req.params.id as string, req.body);
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await categoriesService.remove(req.tenantId!, req.params.id as string);
    res.json({ message: 'Categoría eliminada' });
  } catch (error) {
    next(error);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    await categoriesService.reorder(req.tenantId!, req.body.ids);
    res.json({ message: 'Orden actualizado' });
  } catch (error) {
    next(error);
  }
}
