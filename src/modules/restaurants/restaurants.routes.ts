import { Router } from 'express';
import { menuLimiter } from '../../middleware/rateLimiter';
import * as ctrl from './restaurants.controller';

const router = Router();

router.use(menuLimiter);
router.get('/nearby', ctrl.getNearby);
router.get('/:slug', ctrl.getRestaurantPublic);

export default router;
