import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { periodQuerySchema, topProductsQuerySchema } from './reports.schema';
import * as ctrl from './reports.controller';

const router = Router();
router.use(authenticate, roleGuard('owner', 'admin'));

router.get('/sales', validate({ query: periodQuerySchema }), ctrl.sales);
router.get('/top-products', validate({ query: topProductsQuerySchema }), ctrl.topProducts);
router.get('/by-waiter', validate({ query: periodQuerySchema }), ctrl.byWaiter);
router.get('/dashboard', ctrl.dashboard);

export default router;
