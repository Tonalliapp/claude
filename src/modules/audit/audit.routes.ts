import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import * as ctrl from './audit.controller';

const router = Router();
router.use(authenticate, roleGuard('owner', 'admin'));

router.get('/', ctrl.list);

export default router;
