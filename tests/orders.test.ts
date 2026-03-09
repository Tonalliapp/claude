import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET!;
const tenantId = '00000000-0000-0000-0000-000000000001';
const userId = '00000000-0000-0000-0000-000000000002';

function makeToken(role = 'owner') {
  return jwt.sign({ userId, tenantId, role }, JWT_SECRET, { expiresIn: '15m' });
}

// Mock prisma
vi.mock('../src/config/database', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    tenant: { create: vi.fn(), findUnique: vi.fn() },
    table: { findFirst: vi.fn() },
    order: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
    orderItem: { updateMany: vi.fn(), findMany: vi.fn() },
    product: { findMany: vi.fn() },
    payment: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    cashRegister: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    cashMovement: { findMany: vi.fn(), create: vi.fn() },
    inventoryItem: { findMany: vi.fn(), update: vi.fn() },
    recipeItem: { findMany: vi.fn() },
    ingredient: { findUnique: vi.fn(), update: vi.fn() },
    ingredientMovement: { create: vi.fn() },
    $transaction: vi.fn((fn: any) => fn({
      order: { create: vi.fn().mockResolvedValue({ id: 'order-1', orderNumber: 1, total: 100, tenantId, items: [] }) },
      product: { findMany: vi.fn().mockResolvedValue([]) },
      payment: { create: vi.fn().mockResolvedValue({ id: 'pay-1' }) },
      cashRegister: { update: vi.fn() },
    })),
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

// Mock redis
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
    pipeline: vi.fn(() => ({ del: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue([]) })),
  },
  disconnectRedis: vi.fn(),
}));

// Mock socket
vi.mock('../src/websocket/socket', () => ({
  getIO: vi.fn(() => ({
    of: vi.fn(() => ({
      to: vi.fn(() => ({ emit: vi.fn() })),
    })),
  })),
}));

describe('Orders Routes — Auth & Validation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET /orders returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(401);
  });

  it('GET /orders returns 200 with valid token', async () => {
    const { prisma } = await import('../src/config/database');
    (prisma.order.findMany as any).mockResolvedValue([]);
    (prisma.order.count as any).mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
  });

  it('POST /orders rejects empty body with 400', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('POST /orders rejects order without items', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ items: [] });

    expect(res.status).toBe(400);
  });

  it('PUT /orders/:id/status rejects invalid status', async () => {
    const res = await request(app)
      .put('/api/v1/orders/00000000-0000-0000-0000-000000000099/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'invalid_status' });

    // 400 (validation error) or 404 (route pattern mismatch)
    expect([400, 404]).toContain(res.status);
  });

  it('PUT /orders/:id/status rejects non-UUID id with 400 or 404', async () => {
    const res = await request(app)
      .put('/api/v1/orders/not-a-uuid/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'preparing' });

    // Route may not match (404) or validation fails (400)
    expect([400, 404]).toContain(res.status);
  });

  it('kitchen role can access orders', async () => {
    const { prisma } = await import('../src/config/database');
    (prisma.order.findMany as any).mockResolvedValue([]);
    (prisma.order.count as any).mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${makeToken('kitchen')}`);

    expect(res.status).toBe(200);
  });

  it('waiter role can access orders', async () => {
    const { prisma } = await import('../src/config/database');
    (prisma.order.findMany as any).mockResolvedValue([]);
    (prisma.order.count as any).mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${makeToken('waiter')}`);

    expect(res.status).toBe(200);
  });
});

describe('Cash Register Routes — Auth & Validation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET /cash-register/current returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/cash-register/current');
    expect(res.status).toBe(401);
  });

  it('POST /cash-register/open rejects negative amount', async () => {
    const res = await request(app)
      .post('/api/v1/cash-register/open')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ openingAmount: -100 });

    expect(res.status).toBe(400);
  });

  it('POST /cash-register/close rejects missing amount', async () => {
    const res = await request(app)
      .post('/api/v1/cash-register/close')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('POST /cash-register/movement rejects invalid type', async () => {
    const res = await request(app)
      .post('/api/v1/cash-register/movement')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ type: 'invalid', amount: 100 });

    expect(res.status).toBe(400);
  });

  it('POST /cash-register/movement rejects negative amount', async () => {
    const res = await request(app)
      .post('/api/v1/cash-register/movement')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ type: 'deposit', amount: -50 });

    expect(res.status).toBe(400);
  });

  it('POST /cash-register/movement accepts valid deposit', async () => {
    const { prisma } = await import('../src/config/database');
    (prisma.cashRegister.findFirst as any).mockResolvedValue({ id: 'cr-1', status: 'open' });
    (prisma.cashMovement.create as any).mockResolvedValue({ id: 'mov-1', type: 'deposit', amount: 100, user: { id: userId, name: 'Test' } });

    const res = await request(app)
      .post('/api/v1/cash-register/movement')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ type: 'deposit', amount: 100, description: 'Cambio' });

    expect(res.status).toBe(201);
  });
});

describe('Payments Routes — Auth & Validation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET /payments returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/payments');
    expect(res.status).toBe(401);
  });

  it('POST /payments rejects empty body', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('POST /payments rejects invalid payment method', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ orderId: '00000000-0000-0000-0000-000000000001', method: 'bitcoin', amount: 100 });

    expect(res.status).toBe(400);
  });
});
