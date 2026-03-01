import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { createTableSchema, updateTableSchema, statusSchema, idParamSchema, customQRSchema, brandedQRSchema } from './tables.schema';
import * as ctrl from './tables.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', roleGuard('owner', 'admin'), validate({ body: createTableSchema }), ctrl.create);
router.put('/:id', roleGuard('owner', 'admin'), validate({ params: idParamSchema, body: updateTableSchema }), ctrl.update);
router.delete('/:id', roleGuard('owner', 'admin'), validate({ params: idParamSchema }), ctrl.remove);
router.get('/:id/qr', validate({ params: idParamSchema }), ctrl.getQR);
router.get('/:id/qr-image', validate({ params: idParamSchema }), ctrl.getQRImage);
router.post('/:id/qr-custom', roleGuard('owner', 'admin'), validate({ params: idParamSchema, body: customQRSchema }), ctrl.getCustomQR);
router.post('/:id/qr-branded', roleGuard('owner', 'admin'), validate({ params: idParamSchema, body: brandedQRSchema }), ctrl.getBrandedQR);
router.patch('/:id/status', validate({ params: idParamSchema, body: statusSchema }), ctrl.updateStatus);

export default router;
