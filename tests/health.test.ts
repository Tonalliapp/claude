import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Mock database and redis for health check
vi.mock('../src/config/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    tenant: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../src/config/redis', () => ({
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
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

vi.mock('../src/websocket/socket', () => ({
  getIO: vi.fn(() => ({
    of: vi.fn(() => ({
      to: vi.fn(() => ({ emit: vi.fn() })),
    })),
  })),
}));

describe('Health Check', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.checks.database).toBe('ok');
    expect(res.body.checks.redis).toBe('ok');
  });

  it('GET /api/v1/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
