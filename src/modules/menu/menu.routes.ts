import { Router } from 'express';
import * as ctrl from './menu.controller';

const router = Router();

// Public endpoints — no authentication required
router.get('/:slug', ctrl.getMenu);
router.get('/:slug/table/:number', ctrl.getTableInfo);

export default router;
