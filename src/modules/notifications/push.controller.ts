import { Request, Response, NextFunction } from 'express';
import * as pushService from './push.service';

export async function getVapidKey(_req: Request, res: Response) {
  const key = pushService.getVapidPublicKey();
  res.json({ publicKey: key || null });
}

export async function subscribe(req: Request, res: Response, next: NextFunction) {
  try {
    await pushService.subscribe(req.tenantId!, req.user!.userId, req.body.subscription);
    res.json({ subscribed: true });
  } catch (error) {
    next(error);
  }
}

export async function unsubscribe(req: Request, res: Response, next: NextFunction) {
  try {
    await pushService.unsubscribe(req.tenantId!, req.body.endpoint);
    res.json({ unsubscribed: true });
  } catch (error) {
    next(error);
  }
}
