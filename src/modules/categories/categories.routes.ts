import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { createCategorySchema, updateCategorySchema, reorderSchema, idParamSchema } from './categories.schema';
import * as ctrl from './categories.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', roleGuard('owner', 'admin'), validate({ body: createCategorySchema }), ctrl.create);
router.put('/reorder', roleGuard('owner', 'admin'), validate({ body: reorderSchema }), ctrl.reorder);
router.put('/:id', roleGuard('owner', 'admin'), validate({ params: idParamSchema, body: updateCategorySchema }), ctrl.update);
router.delete('/:id', roleGuard('owner', 'admin'), validate({ params: idParamSchema }), ctrl.remove);

export default router;
