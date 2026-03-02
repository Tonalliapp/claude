import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { authConfig } from '../../config/auth';
import { AppError } from '../../middleware/errorHandler';
import type { JwtPayload } from '../../middleware/authenticate';
import type { SuperadminLoginInput } from './admin.schema';

function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(
    { ...payload },
    authConfig.accessToken.secret,
    { expiresIn: authConfig.accessToken.expiresIn as unknown as number },
  );

  const refreshToken = crypto.randomBytes(48).toString('hex');

  return { accessToken, refreshToken };
}

async function storeRefreshToken(token: string, payload: JwtPayload) {
  const key = `refresh:${token}`;
  await redis.set(key, JSON.stringify(payload), 'EX', authConfig.refreshToken.ttl);
}

export async function impersonateTenant(tenantId: string, superadminUserId: string) {
  const tenant = await prisma.user.findFirst({
    where: { tenantId, role: 'owner', active: true },
    select: { id: true, tenantId: true, name: true, role: true },
  });

  if (!tenant || !tenant.tenantId) {
    throw new AppError(404, 'No se encontro owner del restaurante', 'OWNER_NOT_FOUND');
  }

  const jwtPayload: JwtPayload = {
    userId: tenant.id,
    tenantId: tenant.tenantId,
    role: tenant.role as JwtPayload['role'],
  };

  const accessToken = jwt.sign(
    { ...jwtPayload, impersonatedBy: superadminUserId },
    authConfig.accessToken.secret,
    { expiresIn: '30m' },
  );

  const refreshTokenStr = crypto.randomBytes(48).toString('hex');
  await storeRefreshToken(refreshTokenStr, jwtPayload);

  return { accessToken, refreshToken: refreshTokenStr };
}

export async function superadminLogin(input: SuperadminLoginInput) {
  const user = await prisma.user.findFirst({
    where: { email: input.email, role: 'superadmin', active: true },
  });

  if (!user) {
    throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) {
    throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  const jwtPayload: JwtPayload = {
    userId: user.id,
    tenantId: null,
    role: 'superadmin',
  };

  const tokens = generateTokens(jwtPayload);
  await storeRefreshToken(tokens.refreshToken, jwtPayload);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
}
