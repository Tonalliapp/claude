import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

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
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use('/api/', apiLimiter);

// ─── Health Check ─────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────
// Public (no auth)
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/client/orders', clientOrdersRoutes);

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
app.use('/api/v1/cash-register', cashRegisterRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/reports', reportsRoutes);

// ─── 404 ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
});

// ─── Error Handler ────────────────────────────────
app.use(errorHandler);

export default app;
