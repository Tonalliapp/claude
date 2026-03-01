// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-chars-long';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9000';
process.env.MINIO_ACCESS_KEY = 'testkey';
process.env.MINIO_SECRET_KEY = 'testsecret';
process.env.MINIO_BUCKET = 'test-bucket';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.MENU_BASE_URL = 'http://localhost:5174';
process.env.API_BASE_URL = 'http://localhost:3001';
