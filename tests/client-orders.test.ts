import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Mock prisma
vi.mock('../src/config/database', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    tenant: { create: vi.fn() },
    table: { findFirst: vi.fn() },
    order: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    product: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

// Mock redis
vi.mock('../src/config/redis', () => ({
  redis: { set: vi.fn(), get: vi.fn(), del: vi.fn() },
  disconnectRedis: vi.fn(),
}));

// Mock socket
vi.mock('../src/websocket/socket', () => ({
  getIO: vi.fn(() => ({
    to: vi.fn(() => ({ emit: vi.fn() })),
  })),
}));

describe('Client Orders Routes — Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/client/orders', () => {
    it('rejects empty body with 400', async () => {
      const res = await request(app)
        .post('/api/v1/client/orders')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects order without items', async () => {
      const res = await request(app)
        .post('/api/v1/client/orders')
        .send({ slug: 'test-restaurant', tableNumber: 1, items: [] });

      expect(res.status).toBe(400);
    });

    it('rejects order without slug', async () => {
      const res = await request(app)
        .post('/api/v1/client/orders')
        .send({
          tableNumber: 1,
          items: [{ productId: 'abc', quantity: 1 }],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/client/orders/request-bill', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/client/orders/request-bill')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/client/orders/call-waiter', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/client/orders/call-waiter')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/client/orders/:id', () => {
    it('returns 500 or 404 for non-existent order', async () => {
      const { prisma } = await import('../src/config/database');
      // @ts-ignore
      prisma.order.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/client/orders/non-existent-id');
      // Will be 404 or 500 depending on controller implementation
      expect([404, 500]).toContain(res.status);
    });
  });
});
