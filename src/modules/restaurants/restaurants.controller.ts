import { Request, Response, NextFunction } from 'express';
import * as service from './restaurants.service';

export async function getNearby(req: Request, res: Response, next: NextFunction) {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = Math.min(parseFloat(req.query.radius as string) || 5, 50); // km, max 50
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: { message: 'lat and lng are required', code: 'INVALID_PARAMS' } });
    }

    const restaurants = await service.findNearby(lat, lng, radius, type);
    res.json({ restaurants });
  } catch (error) {
    next(error);
  }
}

export async function getRestaurantPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = req.params.slug as string;
    const restaurant = await service.getBySlug(slug);
    if (!restaurant) {
      return res.status(404).json({ error: { message: 'Restaurante no encontrado', code: 'NOT_FOUND' } });
    }
    res.json({ restaurant });
  } catch (error) {
    next(error);
  }
}
