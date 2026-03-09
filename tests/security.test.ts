import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Mock prisma
vi.mock('../src/config/database', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    tenant: { create: vi.fn(), findUnique: vi.fn() },
    table: { findFirst: vi.fn() },
    order: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    product: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

// Mock redis with full pipeline support
const mockPipeline = {
  del: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};
vi.mock('../src/config/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-2),
    sadd: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
    pipeline: vi.fn(() => mockPipeline),
  },
  disconnectRedis: vi.fn(),
}));

describe('Security — Protected Routes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const protectedRoutes = [
    { method: 'get', path: '/api/v1/users' },
    { method: 'get', path: '/api/v1/orders' },
    { method: 'get', path: '/api/v1/categories' },
    { method: 'get', path: '/api/v1/products' },
    { method: 'get', path: '/api/v1/tables' },
    { method: 'get', path: '/api/v1/inventory' },
    { method: 'get', path: '/api/v1/ingredients' },
    { method: 'get', path: '/api/v1/cash-register/current' },
    { method: 'get', path: '/api/v1/reports/dashboard' },
    { method: 'get', path: '/api/v1/tenants/me' },
    { method: 'put', path: '/api/v1/auth/profile' },
  ];

  for (const route of protectedRoutes) {
    it(`${route.method.toUpperCase()} ${route.path} returns 401 without token`, async () => {
      const res = await (request(app) as any)[route.method](route.path);
      expect(res.status).toBe(401);
    });
  }

  it('rejects invalid JWT token', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
  });

  it('rejects expired JWT format', async () => {
    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ4Iiwicm9sZSI6Im93bmVyIn0.invalid');
    expect(res.status).toBe(401);
  });
});

describe('Security — Input Validation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects oversized JSON body (>5MB)', async () => {
    const hugeBody = { data: 'x'.repeat(6 * 1024 * 1024) };
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(hugeBody);
    // Express returns 413 or 500 depending on how the parser handles it
    expect([413, 500]).toContain(res.status);
  });

  it('404 for unknown public API routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects SQL-injection-like values gracefully (Zod catches them)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: "'; DROP TABLE users; --",
        username: 'admin',
        password: 'test123456',
      });
    // Should be 400 (invalid email) or 429 (rate limited), never 500
    expect([400, 429]).toContain(res.status);
  });
});

describe('Security — Tenant Config Schema', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects arbitrary fields in tenant config (strict schema)', async () => {
    // This test verifies the Zod .strict() prevents injection of arbitrary config fields
    // We can't test the full flow without auth, but we test the schema directly
    const { updateTenantSchema } = await import('../src/modules/tenants/tenants.schema');

    const result = updateTenantSchema.safeParse({
      name: 'Test',
      config: {
        address: 'Calle 1',
        maliciousField: 'hacked',
        maxUsers: 99999,
      },
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid tenant config', async () => {
    const { updateTenantSchema } = await import('../src/modules/tenants/tenants.schema');

    const result = updateTenantSchema.safeParse({
      name: 'Mi Restaurante',
      config: {
        address: 'Calle 1',
        phone: '3221234567',
        currency: 'MXN',
        openTime: '09:00',
        closeTime: '22:00',
        timezone: 'America/Mexico_City',
        ivaEnabled: true,
        ivaRate: 16,
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid IVA rate', async () => {
    const { updateTenantSchema } = await import('../src/modules/tenants/tenants.schema');

    const result = updateTenantSchema.safeParse({
      config: { ivaRate: 200 },
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-time-format strings', async () => {
    const { updateTenantSchema } = await import('../src/modules/tenants/tenants.schema');

    const result = updateTenantSchema.safeParse({
      config: { openTime: 'not-a-time' },
    });

    expect(result.success).toBe(false);
  });
});

describe('Security — Account Lockout (Redis)', () => {
  it('lockout functions are async and use Redis', async () => {
    const lockout = await import('../src/middleware/accountLockout');
    // All functions should be async (return promises)
    expect(lockout.isLocked('127.0.0.1')).toBeInstanceOf(Promise);
    expect(lockout.recordFailedAttempt('127.0.0.1')).toBeInstanceOf(Promise);
    expect(lockout.clearAttempts('127.0.0.1')).toBeInstanceOf(Promise);
    expect(lockout.getRemainingLockoutSeconds('127.0.0.1')).toBeInstanceOf(Promise);
  });

  it('isLocked returns false for unknown IP', async () => {
    const lockout = await import('../src/middleware/accountLockout');
    const result = await lockout.isLocked('192.168.1.1');
    expect(result).toBe(false);
  });

  it('supports dual-key lockout (IP + account)', async () => {
    const lockout = await import('../src/middleware/accountLockout');
    // Should not throw when called with email and username
    await expect(lockout.recordFailedAttempt('10.0.0.1', 'test@test.com', 'admin')).resolves.not.toThrow();
    await expect(lockout.isLocked('10.0.0.1', 'test@test.com', 'admin')).resolves.toBe(false);
    await expect(lockout.clearAttempts('10.0.0.1', 'test@test.com', 'admin')).resolves.not.toThrow();
  });
});

describe('Security — CORS', () => {
  it('includes CORS headers for allowed origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does not include CORS for disallowed origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Security — Headers', () => {
  it('includes security headers from Helmet', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    // x-xss-protection may be '0' (Helmet disables it) or undefined
    const xss = res.headers['x-xss-protection'];
    expect(xss === undefined || xss === '0').toBe(true);
  });
});
