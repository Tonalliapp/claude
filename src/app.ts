import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './config/swagger';
import { setupSentryErrorHandler } from './config/sentry';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import tenantsRoutes from './modules/tenants/tenants.routes';
import usersRoutes from './modules/users/users.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import productsRoutes from './modules/products/products.routes';
import tablesRoutes from './modules/tables/tables.routes';
import ordersRoutes from './modules/orders/orders.routes';
import menuRoutes from './modules/menu/menu.routes';
import clientOrdersRoutes from './modules/clientOrders/clientOrders.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import cashRegisterRoutes from './modules/cashRegister/cashRegister.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import reportsRoutes from './modules/reports/reports.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';
import adminRoutes from './modules/admin/admin.routes';
import deliveryRoutes from './modules/delivery/delivery.routes';
import ingredientsRoutes from './modules/ingredients/ingredients.routes';
import pushRoutes from './modules/notifications/push.routes';
import auditRoutes from './modules/audit/audit.routes';

const app = express();

// Trust first proxy (nginx)
app.set('trust proxy', 1);

// ─── Global Middleware ────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(',').filter(Boolean),
    credentials: true,
  }),
);
app.use(compression());
// Stripe webhook needs raw body — must be before json parser
app.use('/api/v1/subscriptions/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({
  limit: '5mb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use('/api/', apiLimiter);

// ─── API Docs ────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Tonalli API Docs',
}));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ─── Health Check ─────────────────────────────────
app.get('/health', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  // Database
  try {
    const { prisma } = await import('./config/database');
    await prisma.$queryRawUnsafe('SELECT 1');
    checks.database = 'ok';
  } catch { checks.database = 'error'; }

  // Redis
  try {
    const { redis } = await import('./config/redis');
    await redis.ping();
    checks.redis = 'ok';
  } catch { checks.redis = 'error'; }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// ─── API Routes ───────────────────────────────────
// Public (no auth)
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/client/orders', clientOrdersRoutes);

// Delivery partner integration (HMAC auth)
app.use('/api/v1/delivery', deliveryRoutes);

// Auth
app.use('/api/v1/auth', authRoutes);

// Protected
app.use('/api/v1/tenants', tenantsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/tables', tablesRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/ingredients', ingredientsRoutes);
app.use('/api/v1/cash-register', cashRegisterRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/subscriptions', subscriptionsRoutes);
app.use('/api/v1/push', pushRoutes);
app.use('/api/v1/audit', auditRoutes);

// Admin (superadmin only)
app.use('/api/v1/admin', adminRoutes);

// ─── 404 ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
});

// ─── Sentry Error Handler ────────────────────────
setupSentryErrorHandler(app);

// ─── Error Handler ────────────────────────────────
app.use(errorHandler);

export default app;
