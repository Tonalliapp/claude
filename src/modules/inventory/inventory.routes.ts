import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { updateInventorySchema, movementSchema, productIdParamSchema } from './inventory.schema';
import * as ctrl from './inventory.controller';

const router = Router();
router.use(authenticate, roleGuard('owner', 'admin'));

router.get('/', ctrl.list);
router.get('/alerts', ctrl.getAlerts);
router.put('/:productId', validate({ params: productIdParamSchema, body: updateInventorySchema }), ctrl.upsert);
router.post('/:productId/movement', validate({ params: productIdParamSchema, body: movementSchema }), ctrl.addMovement);

export default router;
