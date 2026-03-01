import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { clientOrdersLimiter } from '../../middleware/rateLimiter';
import { createClientOrderSchema, requestBillSchema, callWaiterSchema } from './clientOrders.schema';
import * as ctrl from './clientOrders.controller';

const router = Router();

// Public endpoints — no authentication required (rate limited: 20 req/min per IP)
router.use(clientOrdersLimiter);
router.post('/', validate({ body: createClientOrderSchema }), ctrl.createOrder);
router.get('/:id', ctrl.getOrder);
router.post('/request-bill', validate({ body: requestBillSchema }), ctrl.requestBill);
router.post('/call-waiter', validate({ body: callWaiterSchema }), ctrl.callWaiter);

export default router;
