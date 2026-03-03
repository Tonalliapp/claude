import { Request, Response, NextFunction } from 'express';
import * as ingredientsService from './ingredients.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const ingredients = await ingredientsService.list(req.tenantId!);
    res.json(ingredients);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const ingredient = await ingredientsService.getById(req.tenantId!, req.params.id as string);
    res.json(ingredient);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const ingredient = await ingredientsService.create(req.tenantId!, req.body);
    res.status(201).json(ingredient);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const ingredient = await ingredientsService.update(req.tenantId!, req.params.id as string, req.body);
    res.json(ingredient);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await ingredientsService.remove(req.tenantId!, req.params.id as string);
    res.json({ message: 'Ingrediente eliminado' });
  } catch (error) {
    next(error);
  }
}

export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const alerts = await ingredientsService.getAlerts(req.tenantId!);
    res.json(alerts);
  } catch (error) {
    next(error);
  }
}

export async function addMovement(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ingredientsService.addMovement(
      req.tenantId!,
      req.params.id as string,
      req.body,
      req.user!.userId,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}
