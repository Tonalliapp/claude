import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import {
  createIngredientSchema,
  updateIngredientSchema,
  ingredientMovementSchema,
  idParamSchema,
  barcodeParamSchema,
} from './ingredients.schema';
import * as ctrl from './ingredients.controller';

const router = Router();
router.use(authenticate, roleGuard('owner', 'admin'));

router.get('/', ctrl.list);
router.get('/alerts', ctrl.getAlerts);
router.get('/barcode/:barcode', validate({ params: barcodeParamSchema }), ctrl.findByBarcode);
router.get('/:id', validate({ params: idParamSchema }), ctrl.getById);
router.post('/', validate({ body: createIngredientSchema }), ctrl.create);
router.put('/:id', validate({ params: idParamSchema, body: updateIngredientSchema }), ctrl.update);
router.delete('/:id', validate({ params: idParamSchema }), ctrl.remove);
router.post('/:id/movement', validate({ params: idParamSchema, body: ingredientMovementSchema }), ctrl.addMovement);

export default router;
