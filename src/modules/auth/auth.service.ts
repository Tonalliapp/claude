import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { authConfig } from '../../config/auth';
import { AppError } from '../../middleware/errorHandler';
import { generateUniqueSlug } from '../../utils/generateSlug';
import type { JwtPayload } from '../../middleware/authenticate';
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

export async function login(input: LoginInput) {
  // Step 1: Find the owner by email to identify the tenant
  const owner = await prisma.user.findFirst({
    where: { email: input.email, role: 'owner', active: true },
    include: { tenant: { select: { id: true, status: true, slug: true, name: true } } },
  });

  if (!owner) {
    throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  if (owner.tenant.status !== 'active') {
    throw new AppError(403, 'Restaurante suspendido o cancelado', 'TENANT_INACTIVE');
  }

  // Step 2: Find the user by (tenantId, username)
  const user = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId: owner.tenantId, username: input.username } },
  });

  if (!user || !user.active) {
    throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  // Step 3: Verify password
  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) {
    throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

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
      id: owner.tenant.id,
      name: owner.tenant.name,
      slug: owner.tenant.slug,
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

  if (!user || user.tenant.status !== 'active') {
    throw new AppError(401, 'Usuario o restaurante inactivo', 'USER_INACTIVE');
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

export async function updateProfile(userId: string, tenantId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new AppError(404, 'Usuario no encontrado', 'NOT_FOUND');

  const updateData: Record<string, unknown> = {};

  if (input.name) updateData.name = input.name;

  if (input.email && input.email !== user.email) {
    const exists = await prisma.user.findFirst({
      where: { tenantId, email: input.email, id: { not: userId } },
    });
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

  // TODO: Send email with reset link
  // For now, log the token (in production, integrate with email service)
  console.log(`[Password Reset] Token for ${email}: ${token}`);

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
  // (scan Redis for matching tokens would be complex, so we skip for now)

  return { message: 'Contraseña actualizada correctamente' };
}
