import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { checkFeature } from '../../middleware/planLimits';
import { periodQuerySchema, topProductsQuerySchema } from './reports.schema';
import * as ctrl from './reports.controller';

const router = Router();
router.use(authenticate, roleGuard('owner', 'admin'));

// Basic plan: sales, top-products, dashboard
router.get('/sales', validate({ query: periodQuerySchema }), ctrl.sales);
router.get('/top-products', validate({ query: topProductsQuerySchema }), ctrl.topProducts);
router.get('/dashboard', ctrl.dashboard);

// Professional+: full reports
router.get('/payment-breakdown', checkFeature('full_reports'), validate({ query: periodQuerySchema }), ctrl.paymentBreakdown);
router.get('/by-waiter', checkFeature('full_reports'), validate({ query: periodQuerySchema }), ctrl.byWaiter);
router.get('/tips', validate({ query: periodQuerySchema }), ctrl.tipsByWaiter);
router.get('/product-costs', checkFeature('full_reports'), ctrl.productCosts);
router.get('/ingredient-consumption', checkFeature('full_reports'), validate({ query: periodQuerySchema }), ctrl.ingredientConsumption);
router.get('/prep-time', ctrl.prepTimeStats);

// Business alerts (proactive monitoring)
router.get('/business-alerts', ctrl.businessAlerts);

// Premium: export
router.get('/export/sales', checkFeature('export_reports'), validate({ query: periodQuerySchema }), ctrl.exportSalesCsv);

export default router;
