import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { upload } from '../../middleware/upload';
import { updateTenantSchema, toggleYessweraSchema } from './tenants.schema';
import * as tenantsController from './tenants.controller';

const router = Router();

router.use(authenticate);

router.get('/me', tenantsController.getMe);
router.put('/me', roleGuard('owner'), validate({ body: updateTenantSchema }), tenantsController.updateMe);
router.post('/me/logo', roleGuard('owner', 'admin'), upload.single('logo'), tenantsController.uploadLogo);

router.get('/me/yesswera', roleGuard('owner', 'admin'), tenantsController.getYessweraStatus);
router.post('/me/yesswera', roleGuard('owner'), validate({ body: toggleYessweraSchema }), tenantsController.toggleYesswera);

export default router;
