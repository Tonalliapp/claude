import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { openCashRegisterSchema, closeCashRegisterSchema, historyQuerySchema, registerIdParamSchema, createMovementSchema } from './cashRegister.schema';
import * as ctrl from './cashRegister.controller';

const router = Router();
router.use(authenticate, roleGuard('owner', 'admin', 'cashier'));

router.get('/current', ctrl.getCurrent);
router.get('/history', validate({ query: historyQuerySchema }), ctrl.history);
router.get('/:id/summary', validate({ params: registerIdParamSchema }), ctrl.summary);
router.post('/open', validate({ body: openCashRegisterSchema }), ctrl.open);
router.post('/close', validate({ body: closeCashRegisterSchema }), ctrl.close);
router.post('/movement', validate({ body: createMovementSchema }), ctrl.createMovement);

export default router;
