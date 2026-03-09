import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Mock prisma
vi.mock('../src/config/database', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    tenant: { create: vi.fn() },
    table: { findFirst: vi.fn() },
    order: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

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

describe('Rate Limiting', () => {
  it('auth routes return rate limit headers', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', username: 'admin', password: 'password123' });

    // Should have standard rate limit headers
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('menu routes return rate limit headers', async () => {
    const res = await request(app)
      .get('/api/v1/menu/test-slug');

    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  it('client orders routes return rate limit headers', async () => {
    const res = await request(app)
      .post('/api/v1/client/orders')
      .send({});

    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  it('auth rate limit is stricter than global (5 vs 100)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', username: 'admin', password: 'password123' });

    const limit = parseInt(res.headers['ratelimit-limit'], 10);
    expect(limit).toBeLessThanOrEqual(5);
  });
});
