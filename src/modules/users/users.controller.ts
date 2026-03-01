import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await usersService.list(req.tenantId!);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.create(req.tenantId!, req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.update(req.tenantId!, req.params.id as string, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.deactivate(req.tenantId!, req.params.id as string);
    res.json(user);
  } catch (error) {
    next(error);
  }
}
