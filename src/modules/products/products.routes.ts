import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { upload } from '../../middleware/upload';
import { createProductSchema, updateProductSchema, availabilitySchema, idParamSchema, reorderProductsSchema } from './products.schema';
import * as ctrl from './products.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', validate({ params: idParamSchema }), ctrl.getById);
router.post('/', roleGuard('owner', 'admin'), validate({ body: createProductSchema }), ctrl.create);
router.put('/reorder', roleGuard('owner', 'admin'), validate({ body: reorderProductsSchema }), ctrl.reorder);
router.put('/:id', roleGuard('owner', 'admin'), validate({ params: idParamSchema, body: updateProductSchema }), ctrl.update);
router.delete('/:id', roleGuard('owner', 'admin'), validate({ params: idParamSchema }), ctrl.remove);
router.patch('/:id/availability', roleGuard('owner', 'admin'), validate({ params: idParamSchema, body: availabilitySchema }), ctrl.toggleAvailability);
router.post('/:id/image', roleGuard('owner', 'admin'), validate({ params: idParamSchema }), upload.single('image'), ctrl.uploadImage);

export default router;
