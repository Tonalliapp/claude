import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { createPaymentSchema, listPaymentsQuerySchema } from './payments.schema';
import * as ctrl from './payments.controller';

const router = Router();
router.use(authenticate, roleGuard('owner', 'admin', 'cashier'));

router.get('/', validate({ query: listPaymentsQuerySchema }), ctrl.list);
router.post('/', validate({ body: createPaymentSchema }), ctrl.create);

export default router;
