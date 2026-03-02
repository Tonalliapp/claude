import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
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
    topRevenueTenants,
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
    getTopRevenueTenants(),
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
    topRevenueTenants,
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
    stripeCustomerId: tenant.stripeCustomerId,
    stripeSubId: tenant.stripeSubId,
    stripePriceId: tenant.stripePriceId,
    trialEndsAt: tenant.trialEndsAt,
    planExpiresAt: tenant.planExpiresAt,
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
      tableNumber: o.table?.number ?? null,
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
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [byPlan, totalTenants, activeSubs, expiringSoon] = await Promise.all([
    prisma.tenant.groupBy({
      by: ['plan'],
      _count: { id: true },
      where: { status: 'active' },
    }),
    prisma.tenant.count(),
    prisma.tenant.count({ where: { stripeSubId: { not: null } } }),
    prisma.tenant.findMany({
      where: {
        planExpiresAt: { lte: sevenDaysFromNow, gte: new Date() },
        status: 'active',
      },
      select: { id: true, name: true, slug: true, plan: true, planExpiresAt: true },
      orderBy: { planExpiresAt: 'asc' },
    }),
  ]);

  return {
    totalTenants,
    activeSubs,
    byPlan: byPlan.map((g) => ({
      plan: g.plan,
      count: g._count.id,
    })),
    expiringSoon,
  };
}

// ─── CSV Exports ──────────────────────────────────────

function escapeCsv(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

export async function exportTenantsCsv() {
  const tenants = await prisma.tenant.findMany({
    include: { _count: { select: { users: true, orders: true, products: true, tables: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const header = 'ID,Nombre,Slug,Plan,Status,Usuarios,Pedidos,Productos,Mesas,Creado\n';
  const rows = tenants.map((t) =>
    `${t.id},${escapeCsv(t.name)},${t.slug},${t.plan},${t.status},${t._count.users},${t._count.orders},${t._count.products},${t._count.tables},${t.createdAt.toISOString().split('T')[0]}`
  );
  return header + rows.join('\n');
}

export async function exportUsersCsv() {
  const users = await prisma.user.findMany({
    where: { role: { not: 'superadmin' } },
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const header = 'ID,Nombre,Username,Email,Rol,Activo,Restaurante,UltimoLogin,Creado\n';
  const rows = users.map((u) =>
    `${u.id},${escapeCsv(u.name)},${u.username},${u.email ?? '-'},${u.role},${u.active},${escapeCsv(u.tenant?.name ?? '-')},${u.lastLogin?.toISOString().split('T')[0] ?? '-'},${u.createdAt.toISOString().split('T')[0]}`
  );
  return header + rows.join('\n');
}

export async function exportOrdersCsv() {
  const orders = await prisma.order.findMany({
    include: {
      tenant: { select: { name: true } },
      table: { select: { number: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });

  const header = 'ID,Restaurante,NoPedido,Mesa,Items,Total,Status,Creado\n';
  const rows = orders.map((o) =>
    `${o.id},${escapeCsv(o.tenant?.name ?? '-')},${o.orderNumber},${o.table?.number ?? '-'},${o._count.items},${Number(o.total).toFixed(2)},${o.status},${o.createdAt.toISOString().split('T')[0]}`
  );
  return header + rows.join('\n');
}

export async function exportAuditLogsCsv() {
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });

  const header = 'ID,Fecha,Usuario,Email,Accion,TipoTarget,TargetID,IP\n';
  const rows = logs.map((l) =>
    `${l.id},${l.createdAt.toISOString()},${escapeCsv(l.user.name)},${l.user.email ?? '-'},${l.action},${l.targetType},${l.targetId ?? '-'},${l.ipAddress ?? '-'}`
  );
  return header + rows.join('\n');
}

// ─── Health Score ──────────────────────────────────────

export async function getTenantHealthScore(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError(404, 'Restaurante no encontrado', 'NOT_FOUND');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [categoriesCount, productsCount, tablesCount, staffCount, recentOrders] = await Promise.all([
    prisma.category.count({ where: { tenantId, active: true } }),
    prisma.product.count({ where: { tenantId, available: true } }),
    prisma.table.count({ where: { tenantId, active: true } }),
    prisma.user.count({ where: { tenantId, role: { in: ['admin', 'waiter', 'kitchen', 'cashier'] }, active: true } }),
    prisma.order.count({ where: { tenantId, createdAt: { gte: sevenDaysAgo } } }),
  ]);

  const checks = [
    { label: 'Logo configurado', passed: !!tenant.logoUrl },
    { label: '3+ categorias', passed: categoriesCount >= 3 },
    { label: '10+ productos', passed: productsCount >= 10 },
    { label: '2+ mesas', passed: tablesCount >= 2 },
    { label: '2+ staff', passed: staffCount >= 2 },
    { label: 'Actividad reciente (7 dias)', passed: recentOrders > 0 },
    { label: 'Suscripcion activa', passed: !!tenant.stripeSubId },
  ];

  const score = Math.round((checks.filter((c) => c.passed).length / checks.length) * 100);

  return { score, checks };
}

// ─── Dashboard Enhancement ────────────────────────────

export async function getTopRevenueTenants() {
  const result = await prisma.$queryRaw<Array<{ tenant_id: string; name: string; slug: string; total: string }>>`
    SELECT t.id as tenant_id, t.name, t.slug, COALESCE(SUM(p.amount), 0) as total
    FROM tenants t
    LEFT JOIN orders o ON o.tenant_id = t.id AND o.status = 'paid'
    LEFT JOIN payments p ON p.order_id = o.id
    GROUP BY t.id, t.name, t.slug
    ORDER BY total DESC
    LIMIT 10
  `;

  return result.map((r) => ({
    tenantId: r.tenant_id,
    name: r.name,
    slug: r.slug,
    totalRevenue: Number(r.total),
  }));
}
