import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { openCashRegisterSchema, closeCashRegisterSchema } from './cashRegister.schema';
import * as ctrl from './cashRegister.controller';

const router = Router();
router.use(authenticate, roleGuard('owner', 'admin', 'cashier'));

router.get('/current', ctrl.getCurrent);
router.post('/open', validate({ body: openCashRegisterSchema }), ctrl.open);
router.post('/close', validate({ body: closeCashRegisterSchema }), ctrl.close);

export default router;
