import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { authConfig } from '../../config/auth';
import { AppError } from '../../middleware/errorHandler';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../../config/email';
import { generateUniqueSlug } from '../../utils/generateSlug';
import type { JwtPayload } from '../../middleware/authenticate';
import { isLocked, recordFailedAttempt, clearAttempts, getRemainingLockoutSeconds } from '../../middleware/accountLockout';
import type { LoginInput, RegisterInput, UpdateProfileInput, ResetPasswordInput } from './auth.schema';

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
  // Track token per user for invalidation on password reset
  await redis.sadd(`user-tokens:${payload.userId}`, key);
  await redis.expire(`user-tokens:${payload.userId}`, authConfig.refreshToken.ttl);
}

async function invalidateUserRefreshTokens(userId: string) {
  const setKey = `user-tokens:${userId}`;
  const tokenKeys = await redis.smembers(setKey);
  if (tokenKeys.length > 0) {
    const pipeline = redis.pipeline();
    for (const tk of tokenKeys) pipeline.del(tk);
    pipeline.del(setKey);
    await pipeline.exec();
  }
}

export async function register(input: RegisterInput) {
  // Check if email already exists globally (for owner registration)
  const existingUser = await prisma.user.findFirst({
    where: { email: input.email, role: 'owner' },
  });
  if (existingUser) {
    throw new AppError(409, 'Ya existe una cuenta con este email', 'EMAIL_EXISTS');
  }

  const slug = await generateUniqueSlug(input.restaurantName);
  const passwordHash = await bcrypt.hash(input.password, authConfig.bcryptRounds);

  // Create tenant + owner user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.restaurantName,
        slug,
        plan: 'basic',
        config: {
          address: input.address || '',
          phone: input.phone || '',
          currency: 'MXN',
          timezone: 'America/Mexico_City',
        },
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: input.ownerName,
        username: 'admin',
        email: input.email,
        passwordHash,
        role: 'owner',
      },
    });

    return { tenant, user };
  });

  const jwtPayload: JwtPayload = {
    userId: result.user.id,
    tenantId: result.tenant.id,
    role: 'owner',
  };

  const tokens = generateTokens(jwtPayload);
  await storeRefreshToken(tokens.refreshToken, jwtPayload);

  await prisma.user.update({
    where: { id: result.user.id },
    data: { lastLogin: new Date() },
  });

  // Send welcome email (non-blocking)
  sendWelcomeEmail(input.email, input.ownerName, input.restaurantName).catch((err) =>
    console.error('[Register] Failed to send welcome email:', err)
  );

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: result.user.id,
      name: result.user.name,
      username: result.user.username,
      email: result.user.email,
      role: result.user.role,
    },
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
    },
  };
}

export async function login(input: LoginInput, clientIp?: string) {
  const { email, username } = input;

  // Check account lockout — dual key: per-IP AND per-account (blocks distributed attacks)
  if (clientIp && await isLocked(clientIp, email, username)) {
    const remaining = await getRemainingLockoutSeconds(clientIp, email, username);
    throw new AppError(
      429,
      `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(remaining / 60)} minuto(s).`,
      'ACCOUNT_LOCKED',
    );
  }

  // Step 1: Find the owner by email to identify the tenant
  const owner = await prisma.user.findFirst({
    where: { email, role: 'owner', active: true },
    include: { tenant: { select: { id: true, status: true, slug: true, name: true } } },
  });

  if (!owner) {
    if (clientIp) await recordFailedAttempt(clientIp, email, username);
    throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  if (!owner.tenant || owner.tenant.status !== 'active') {
    throw new AppError(403, 'Restaurante suspendido o cancelado', 'TENANT_INACTIVE');
  }

  // Step 2: Find the user by (tenantId, username)
  const user = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId: owner.tenantId!, username } },
  });

  if (!user || !user.active) {
    if (clientIp) await recordFailedAttempt(clientIp, email, username);
    throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  // Step 3: Verify password
  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) {
    if (clientIp) await recordFailedAttempt(clientIp, email, username);
    throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  // Successful login — clear lockout attempts for both IP and account
  if (clientIp) await clearAttempts(clientIp, email, username);

  const jwtPayload: JwtPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
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
    tenant: {
      id: owner.tenant!.id,
      name: owner.tenant!.name,
      slug: owner.tenant!.slug,
    },
  };
}

export async function refresh(refreshToken: string) {
  const refreshKey = `refresh:${refreshToken}`;
  const stored = await redis.get(refreshKey);

  if (!stored) {
    throw new AppError(401, 'Refresh token inválido o expirado', 'REFRESH_INVALID');
  }

  await redis.del(refreshKey);

  const payload: JwtPayload = JSON.parse(stored);

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, active: true },
    include: { tenant: { select: { status: true } } },
  });

  if (!user) {
    throw new AppError(401, 'Usuario inactivo', 'USER_INACTIVE');
  }

  if (user.tenant && user.tenant.status !== 'active') {
    throw new AppError(401, 'Restaurante inactivo', 'USER_INACTIVE');
  }

  const tokens = generateTokens(payload);
  await storeRefreshToken(tokens.refreshToken, payload);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  await redis.del(`refresh:${refreshToken}`);
}

export async function updateProfile(userId: string, tenantId: string | undefined, input: UpdateProfileInput) {
  const where: { id: string; tenantId?: string } = { id: userId };
  if (tenantId) where.tenantId = tenantId;
  const user = await prisma.user.findFirst({ where });
  if (!user) throw new AppError(404, 'Usuario no encontrado', 'NOT_FOUND');

  const updateData: Record<string, unknown> = {};

  if (input.name) updateData.name = input.name;

  if (input.email && input.email !== user.email) {
    const emailWhere: Record<string, unknown> = { email: input.email, id: { not: userId } };
    if (tenantId) emailWhere.tenantId = tenantId;
    const exists = await prisma.user.findFirst({ where: emailWhere });
    if (exists) throw new AppError(409, 'El email ya está en uso', 'EMAIL_EXISTS');
    updateData.email = input.email;
  }

  if (input.newPassword) {
    const valid = await bcrypt.compare(input.currentPassword!, user.passwordHash);
    if (!valid) throw new AppError(400, 'Contraseña actual incorrecta', 'INVALID_PASSWORD');
    updateData.passwordHash = await bcrypt.hash(input.newPassword, authConfig.bcryptRounds);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, username: true, email: true, role: true },
  });

  return updated;
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findFirst({
    where: { email, active: true },
  });

  // Always return success to prevent email enumeration
  if (!user) return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };

  const token = crypto.randomBytes(32).toString('hex');
  const key = `password-reset:${token}`;

  // Store reset token in Redis with 1 hour TTL
  await redis.set(key, user.id, 'EX', 3600);

  // Send reset email
  try {
    await sendPasswordResetEmail(email, token, user.name);
  } catch (err) {
    console.error(`[Password Reset] Failed to send email to ${email}:`, err);
  }

  return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };
}

export async function resetPassword(input: ResetPasswordInput) {
  const key = `password-reset:${input.token}`;
  const userId = await redis.get(key);

  if (!userId) {
    throw new AppError(400, 'Token inválido o expirado', 'INVALID_TOKEN');
  }

  await redis.del(key);

  const passwordHash = await bcrypt.hash(input.password, authConfig.bcryptRounds);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Invalidate all existing refresh tokens for this user
  await invalidateUserRefreshTokens(userId);

  return { message: 'Contraseña actualizada correctamente' };
}
