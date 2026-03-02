import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/authenticate';
import { superadminGuard } from '../../middleware/superadminGuard';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  superadminLoginSchema,
  listQuerySchema,
  updateTenantSchema,
  updateUserSchema,
  idParamSchema,
} from './admin.schema';
import * as adminController from './admin.controller';

const router = Router();

// Public
router.post('/login', authLimiter, validate({ body: superadminLoginSchema }), adminController.login);

// All routes below require superadmin auth
router.use(authenticate, superadminGuard);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Tenants
router.get('/tenants', validate({ query: listQuerySchema }), adminController.listTenants);
router.get('/tenants/:id', validate({ params: idParamSchema }), adminController.getTenantDetail);
router.put('/tenants/:id', validate({ params: idParamSchema, body: updateTenantSchema }), adminController.updateTenant);
router.delete('/tenants/:id', validate({ params: idParamSchema }), adminController.deleteTenant);

// Users
router.get('/users', validate({ query: listQuerySchema }), adminController.listUsers);
router.get('/users/:id', validate({ params: idParamSchema }), adminController.getUserDetail);
router.put('/users/:id', validate({ params: idParamSchema, body: updateUserSchema }), adminController.updateUser);

// Orders
router.get('/orders', validate({ query: listQuerySchema }), adminController.listOrders);

// Subscriptions
router.get('/subscriptions', adminController.getSubscriptions);

// Audit Logs
router.get('/audit-logs', validate({ query: listQuerySchema }), adminController.listAuditLogs);

export default router;
