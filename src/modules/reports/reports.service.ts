import { prisma } from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import type { PeriodQuery, TopProductsQuery } from './reports.schema';

export async function salesByPeriod(tenantId: string, query: PeriodQuery) {
  const from = new Date(query.from);
  const to = new Date(query.to);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: 'paid',
      paidAt: { gte: from, lte: to },
    },
    select: { total: true, paidAt: true },
    orderBy: { paidAt: 'asc' },
  });

  const totalSales = orders.reduce(
    (sum, o) => sum.add(o.total.toString()),
    new Decimal(0),
  );

  // Group by date
  const byDate: Record<string, { count: number; total: Decimal }> = {};
  for (const order of orders) {
    const date = order.paidAt!.toISOString().split('T')[0];
    if (!byDate[date]) byDate[date] = { count: 0, total: new Decimal(0) };
    byDate[date].count++;
    byDate[date].total = byDate[date].total.add(order.total.toString());
  }

  const daily = Object.entries(byDate).map(([date, data]) => ({
    date,
    orders: data.count,
    total: data.total.toNumber(),
  }));

  return {
    totalSales: totalSales.toNumber(),
    totalOrders: orders.length,
    averageTicket: orders.length > 0 ? totalSales.div(orders.length).toNumber() : 0,
    daily,
  };
}

export async function topProducts(tenantId: string, query: TopProductsQuery) {
  const where: Record<string, unknown> = {
    order: { tenantId, status: 'paid' },
  };

  if (query.from || query.to) {
    where.order = {
      ...(where.order as object),
      paidAt: {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      },
    };
  }

  const items = await prisma.orderItem.groupBy({
    by: ['productId'],
    where,
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: query.limit,
  });

  // Fetch product names
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, price: true, imageUrl: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return items.map((item) => ({
    product: productMap.get(item.productId),
    totalQuantity: item._sum.quantity ?? 0,
    totalRevenue: item._sum.subtotal ? Number(item._sum.subtotal) : 0,
  }));
}

export async function salesByWaiter(tenantId: string, query: PeriodQuery) {
  const from = new Date(query.from);
  const to = new Date(query.to);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: 'paid',
      paidAt: { gte: from, lte: to },
      userId: { not: null },
    },
    select: { userId: true, total: true },
  });

  // Group by waiter
  const byWaiter: Record<string, { count: number; total: Decimal }> = {};
  for (const order of orders) {
    const uid = order.userId!;
    if (!byWaiter[uid]) byWaiter[uid] = { count: 0, total: new Decimal(0) };
    byWaiter[uid].count++;
    byWaiter[uid].total = byWaiter[uid].total.add(order.total.toString());
  }

  // Fetch user names
  const userIds = Object.keys(byWaiter);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return userIds.map((uid) => ({
    user: userMap.get(uid),
    orders: byWaiter[uid].count,
    total: byWaiter[uid].total.toNumber(),
  })).sort((a, b) => b.total - a.total);
}

export async function paymentBreakdown(tenantId: string, query: PeriodQuery) {
  const from = new Date(query.from);
  const to = new Date(query.to);

  const payments = await prisma.payment.findMany({
    where: {
      order: { tenantId, status: 'paid' },
      createdAt: { gte: from, lte: to },
    },
    select: { method: true, amount: true },
  });

  const byMethod: Record<string, { count: number; total: Decimal }> = {};
  for (const p of payments) {
    if (!byMethod[p.method]) byMethod[p.method] = { count: 0, total: new Decimal(0) };
    byMethod[p.method].count++;
    byMethod[p.method].total = byMethod[p.method].total.add(p.amount.toString());
  }

  return Object.entries(byMethod).map(([method, data]) => ({
    method,
    count: data.count,
    total: data.total.toNumber(),
  }));
}

export async function exportSalesCsv(tenantId: string, query: PeriodQuery) {
  const from = new Date(query.from);
  const to = new Date(query.to);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: 'paid',
      paidAt: { gte: from, lte: to },
    },
    include: {
      table: { select: { number: true } },
      user: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
      payments: { select: { method: true } },
    },
    orderBy: { paidAt: 'asc' },
  });

  const header = 'Fecha,No.Pedido,Tipo,Mesa,Mesero,Productos,Total,MetodoPago\n';
  const rows = orders.map((o) => {
    const date = o.paidAt ? o.paidAt.toISOString().split('T')[0] : '';
    const products = o.items.map((i) => `${i.quantity}x ${i.product.name}`).join('; ');
    const table = o.table?.number ?? '-';
    const waiter = o.user?.name ?? '-';
    const orderType = (o as any).orderType ?? 'dine_in';
    const method = o.payments[0]?.method ?? '-';
    const escapeCsv = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return `${date},${o.orderNumber},${orderType},${table},${escapeCsv(waiter)},${escapeCsv(products)},${Number(o.total).toFixed(2)},${method}`;
  });

  return header + rows.join('\n');
}

export async function dashboard(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayOrders, activeOrders, totalProducts, tables] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, status: 'paid', paidAt: { gte: today } },
      select: { total: true },
    }),
    prisma.order.count({
      where: { tenantId, status: { in: ['pending', 'confirmed', 'preparing', 'ready'] } },
    }),
    prisma.product.count({ where: { tenantId, available: true } }),
    prisma.table.findMany({
      where: { tenantId, active: true },
      select: { status: true },
    }),
  ]);

  const todaySales = todayOrders.reduce(
    (sum, o) => sum.add(o.total.toString()),
    new Decimal(0),
  );

  const occupiedTables = tables.filter((t) => t.status !== 'free').length;

  return {
    todaySales: todaySales.toNumber(),
    todayOrders: todayOrders.length,
    averageTicket: todayOrders.length > 0 ? todaySales.div(todayOrders.length).toNumber() : 0,
    activeOrders,
    totalProducts,
    totalTables: tables.length,
    occupiedTables,
  };
}
