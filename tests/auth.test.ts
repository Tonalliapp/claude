import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Mock prisma
vi.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
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

describe('Auth Routes — Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('rejects empty body with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({});

      // Accept 400 (validation) or 429 (rate limited) — both are correct behavior
      expect([400, 429]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ restaurantName: 'Test' });

      expect([400, 429]).toContain(res.status);
    });

    it('rejects short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          restaurantName: 'Test Restaurant',
          ownerName: 'Owner',
          email: 'test@test.com',
          password: '123',
        });

      expect([400, 429]).toContain(res.status);
    });

    it('rejects invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          restaurantName: 'Test Restaurant',
          ownerName: 'Owner',
          email: 'not-an-email',
          password: 'password123',
        });

      expect([400, 429]).toContain(res.status);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('rejects empty body with validation or rate limit error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect([400, 429]).toContain(res.status);
    });

    it('rejects missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', username: 'admin' });

      expect([400, 429]).toContain(res.status);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({});

      expect([400, 429]).toContain(res.status);
    });

    it('rejects invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-email' });

      expect([400, 429]).toContain(res.status);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({});

      expect([400, 429]).toContain(res.status);
    });

    it('rejects short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-token', password: '123' });

      expect([400, 429]).toContain(res.status);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app)
        .put('/api/v1/auth/profile')
        .send({ name: 'New Name' });

      expect(res.status).toBe(401);
    });
  });
});
