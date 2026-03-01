import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { createUserSchema, updateUserSchema, userIdParamSchema } from './users.schema';
import * as usersController from './users.controller';

const router = Router();

router.use(authenticate, roleGuard('owner', 'admin'));

router.get('/', usersController.list);
router.post('/', validate({ body: createUserSchema }), usersController.create);
router.put('/:id', validate({ params: userIdParamSchema, body: updateUserSchema }), usersController.update);
router.delete('/:id', validate({ params: userIdParamSchema }), usersController.deactivate);

export default router;
