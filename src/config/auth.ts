import { env } from './env';

export const authConfig = {
  accessToken: {
    secret: env.JWT_ACCESS_SECRET,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  },
  refreshToken: {
    secret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    // 7 days in seconds for Redis TTL
    ttl: 7 * 24 * 60 * 60,
  },
  bcryptRounds: 12,
};
