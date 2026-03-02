import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type { ListQueryInput, UpdateTenantInput, UpdateUserInput } from './admin.schema';

// ─── Dashboard ──────────────────────────────────────

export async function getDashboard() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalTenants,
    activeTenants,
    totalUsers,
    totalOrders,
    revenueResult,
    recentTenants,
    tenantsByPlan,
    monthlyRegistrations,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'active' } }),
    prisma.user.count({ where: { role: { not: 'superadmin' } } }),
    prisma.order.count(),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true },
    }),
    prisma.tenant.groupBy({
      by: ['plan'],
      _count: { id: true },
    }),
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM tenants
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY month
      ORDER BY month ASC
    `,
  ]);

  return {
    kpis: {
      totalTenants,
      activeTenants,
      totalUsers,
      totalOrders,
      totalRevenue: Number(revenueResult._sum.amount ?? 0),
    },
    recentTenants,
    tenantsByPlan: tenantsByPlan.map((g) => ({
      plan: g.plan,
      count: g._count.id,
    })),
    monthlyRegistrations: monthlyRegistrations.map((r) => ({
      month: r.month,
      count: Number(r.count),
    })),
  };
}

// ─── Tenants ────────────────────────────────────────

export async function listTenants(query: ListQueryInput) {
  const { page, limit, search, status, plan } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.TenantWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status as Prisma.EnumTenantStatusFilter;
  }

  if (plan) {
    where.plan = plan as Prisma.EnumPlanFilter;
  }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        _count: { select: { users: true, orders: true, products: true, tables: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.tenant.count({ where }),
  ]);

  return {
    data: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      maxTables: t.maxTables,
      maxUsers: t.maxUsers,
      maxProducts: t.maxProducts,
      createdAt: t.createdAt,
      stats: t._count,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTenantDetail(id: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, username: true, email: true, role: true, active: true, lastLogin: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { orders: true, products: true, tables: true, categories: true } },
    },
  });

  if (!tenant) {
    throw new AppError(404, 'Restaurante no encontrado', 'NOT_FOUND');
  }

  const [orderStats, revenueResult] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where: { tenantId: id },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { order: { tenantId: id } },
      _sum: { amount: true },
    }),
  ]);

  return {
    ...tenant,
    stats: {
      ...tenant._count,
      totalRevenue: Number(revenueResult._sum.amount ?? 0),
      ordersByStatus: orderStats.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    },
  };
}

export async function updateTenant(id: string, input: UpdateTenantInput) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new AppError(404, 'Restaurante no encontrado', 'NOT_FOUND');
  }

  return prisma.tenant.update({
    where: { id },
    data: input,
  });
}

export async function deleteTenant(id: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new AppError(404, 'Restaurante no encontrado', 'NOT_FOUND');
  }

  // Cascade delete in correct order
  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { order: { tenantId: id } } });
    await tx.orderItem.deleteMany({ where: { order: { tenantId: id } } });
    await tx.order.deleteMany({ where: { tenantId: id } });
    await tx.cashRegister.deleteMany({ where: { tenantId: id } });
    await tx.inventoryMovement.deleteMany({ where: { inventory: { tenantId: id } } });
    await tx.inventory.deleteMany({ where: { tenantId: id } });
    await tx.product.deleteMany({ where: { tenantId: id } });
    await tx.category.deleteMany({ where: { tenantId: id } });
    await tx.table.deleteMany({ where: { tenantId: id } });
    await tx.user.deleteMany({ where: { tenantId: id } });
    await tx.tenant.delete({ where: { id } });
  });

  return { message: 'Restaurante eliminado correctamente' };
}

// ─── Users ──────────────────────────────────────────

export async function listAllUsers(query: ListQueryInput) {
  const { page, limit, search, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    role: { not: 'superadmin' },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status === 'active') where.active = true;
  if (status === 'inactive') where.active = false;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      active: u.active,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
      tenant: u.tenant,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, name: true, slug: true, plan: true, status: true } },
      _count: { select: { orders: true } },
    },
  });

  if (!user || user.role === 'superadmin') {
    throw new AppError(404, 'Usuario no encontrado', 'NOT_FOUND');
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    tenant: user.tenant,
    stats: { orders: user._count.orders },
  };
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === 'superadmin') {
    throw new AppError(404, 'Usuario no encontrado', 'NOT_FOUND');
  }

  return prisma.user.update({
    where: { id },
    data: input,
    select: { id: true, name: true, username: true, email: true, role: true, active: true },
  });
}

// ─── Orders ─────────────────────────────────────────

export async function listAllOrders(query: ListQueryInput) {
  const { page, limit, search, status, from, to } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = status as Prisma.EnumOrderStatusFilter;
  }

  if (search) {
    where.tenant = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        table: { select: { number: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      tableNumber: o.table.number,
      itemCount: o._count.items,
      tenant: o.tenant,
      createdAt: o.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Subscriptions ──────────────────────────────────

export async function getSubscriptionOverview() {
  const [byPlan, totalTenants, activeSubs] = await Promise.all([
    prisma.tenant.groupBy({
      by: ['plan'],
      _count: { id: true },
      where: { status: 'active' },
    }),
    prisma.tenant.count(),
    prisma.tenant.count({ where: { stripeSubId: { not: null } } }),
  ]);

  return {
    totalTenants,
    activeSubs,
    byPlan: byPlan.map((g) => ({
      plan: g.plan,
      count: g._count.id,
    })),
  };
}
