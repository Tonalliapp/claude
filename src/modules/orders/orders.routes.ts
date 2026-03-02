import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import {
  createOrderSchema,
  createPosOrderSchema,
  updateStatusSchema,
  cancelOrderSchema,
  updateItemStatusSchema,
  idParamSchema,
  orderItemParamSchema,
  listQuerySchema,
} from './orders.schema';
import * as ctrl from './orders.controller';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listQuerySchema }), ctrl.list);
router.get('/:id', validate({ params: idParamSchema }), ctrl.getById);
router.post('/pos', roleGuard('owner', 'admin', 'cashier'), validate({ body: createPosOrderSchema }), ctrl.createPosOrder);
router.post('/', roleGuard('owner', 'admin', 'waiter'), validate({ body: createOrderSchema }), ctrl.create);
router.patch('/:id/status', validate({ params: idParamSchema, body: updateStatusSchema }), ctrl.updateStatus);
router.post('/:id/cancel', validate({ params: idParamSchema, body: cancelOrderSchema }), ctrl.cancelOrder);
router.patch(
  '/:id/items/:itemId/status',
  validate({ params: orderItemParamSchema, body: updateItemStatusSchema }),
  ctrl.updateItemStatus,
);

export default router;
