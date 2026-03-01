import { Router } from 'express';
import { menuLimiter } from '../../middleware/rateLimiter';
import * as ctrl from './menu.controller';

const router = Router();

// Public endpoints — no authentication required (rate limited: 60 req/min per IP)
router.use(menuLimiter);
router.get('/:slug', ctrl.getMenu);
router.get('/:slug/table/:number', ctrl.getTableInfo);

export default router;
