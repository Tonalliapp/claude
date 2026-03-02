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

// CSV Exports (must be BEFORE /:id routes)
router.get('/tenants/export', adminController.exportTenantsCsv);
router.get('/users/export', adminController.exportUsersCsv);
router.get('/orders/export', adminController.exportOrdersCsv);
router.get('/audit-logs/export', adminController.exportAuditLogsCsv);

// Tenants
router.get('/tenants', validate({ query: listQuerySchema }), adminController.listTenants);
router.get('/tenants/:id', validate({ params: idParamSchema }), adminController.getTenantDetail);
router.get('/tenants/:id/health', validate({ params: idParamSchema }), adminController.getTenantHealth);
router.post('/tenants/:id/impersonate', validate({ params: idParamSchema }), adminController.impersonateTenant);
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
