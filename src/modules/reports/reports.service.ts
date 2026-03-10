import { prisma } from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import { convertUnits } from '../../utils/unitConversion';
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

export async function tipsByWaiter(tenantId: string, query: PeriodQuery) {
  const from = new Date(query.from);
  const to = new Date(query.to);

  const payments = await prisma.payment.findMany({
    where: {
      order: { tenantId, status: 'paid' },
      createdAt: { gte: from, lte: to },
      tipAmount: { not: null, gt: 0 },
    },
    select: {
      tipAmount: true,
      method: true,
      order: { select: { userId: true } },
    },
  });

  const byWaiter: Record<string, { count: number; total: Decimal }> = {};
  let grandTotal = new Decimal(0);

  for (const p of payments) {
    const uid = p.order.userId ?? '_unknown';
    if (!byWaiter[uid]) byWaiter[uid] = { count: 0, total: new Decimal(0) };
    byWaiter[uid].count++;
    byWaiter[uid].total = byWaiter[uid].total.add(p.tipAmount!.toString());
    grandTotal = grandTotal.add(p.tipAmount!.toString());
  }

  const userIds = Object.keys(byWaiter).filter(id => id !== '_unknown');
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const waiters = Object.entries(byWaiter).map(([uid, data]) => ({
    user: userMap.get(uid) ?? { id: uid, name: 'Sin asignar', role: 'unknown' },
    tipCount: data.count,
    tipTotal: data.total.toNumber(),
  })).sort((a, b) => b.tipTotal - a.tipTotal);

  return { waiters, grandTotal: grandTotal.toNumber(), totalPaymentsWithTip: payments.length };
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

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const [todayOrders, activeOrders, totalProducts, tables, weekOrders, topItems] = await Promise.all([
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
    // Last 7 days for trend chart
    prisma.order.findMany({
      where: { tenantId, status: 'paid', paidAt: { gte: weekAgo } },
      select: { total: true, paidAt: true },
    }),
    // Top 5 products today
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { tenantId, status: 'paid', paidAt: { gte: today } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  const todaySales = todayOrders.reduce(
    (sum, o) => sum.add(o.total.toString()),
    new Decimal(0),
  );

  const occupiedTables = tables.filter((t) => t.status !== 'free').length;

  // Build 7-day trend: [{day: 'Lun', sales: 1234, orders: 5}, ...]
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const trendMap = new Map<string, { sales: Decimal; orders: number }>();

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    trendMap.set(key, { sales: new Decimal(0), orders: 0 });
  }

  for (const o of weekOrders) {
    if (!o.paidAt) continue;
    const key = o.paidAt.toISOString().slice(0, 10);
    const entry = trendMap.get(key);
    if (entry) {
      entry.sales = entry.sales.add(o.total.toString());
      entry.orders++;
    }
  }

  const salesTrend = Array.from(trendMap.entries()).map(([dateStr, v]) => ({
    day: dayNames[new Date(dateStr + 'T12:00:00').getDay()],
    sales: v.sales.toNumber(),
    orders: v.orders,
  }));

  // Resolve product names for top items
  const productIds = topItems.map((item) => item.productId);
  const products = productIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameMap = new Map(products.map((p) => [p.id, p.name]));

  const topProducts = topItems.map((item) => ({
    name: nameMap.get(item.productId) ?? 'Desconocido',
    quantity: item._sum?.quantity ?? 0,
  }));

  return {
    todaySales: todaySales.toNumber(),
    todayOrders: todayOrders.length,
    averageTicket: todayOrders.length > 0 ? todaySales.div(todayOrders.length).toNumber() : 0,
    activeOrders,
    totalProducts,
    totalTables: tables.length,
    occupiedTables,
    salesTrend,
    topProducts,
  };
}

export async function productCosts(tenantId: string) {
  const products = await prisma.product.findMany({
    where: { tenantId, available: true },
    include: {
      recipeItems: {
        include: { ingredient: { select: { id: true, name: true, unit: true, costPerUnit: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  let totalMarginSum = new Decimal(0);
  let countWithRecipe = 0;
  let lowestMargin = { name: '', percent: Infinity };
  let highestMargin = { name: '', percent: -Infinity };

  const productList = products.map((product) => {
    const price = new Decimal(product.price.toString());
    let recipeCost = new Decimal(0);

    const recipeItems = product.recipeItems.map((item) => {
      const costPerUnit = new Decimal(item.ingredient.costPerUnit.toString());
      const qty = new Decimal(item.quantity.toString());
      const convertedQty = convertUnits(qty.toNumber(), item.unit, item.ingredient.unit);
      const lineCost = costPerUnit.mul(convertedQty);
      recipeCost = recipeCost.add(lineCost);

      return {
        ingredientName: item.ingredient.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        lineCost: Number(lineCost.toFixed(2)),
      };
    });

    const margin = price.sub(recipeCost);
    const marginPercent = price.greaterThan(0) ? margin.div(price).mul(100).toNumber() : 0;

    if (product.recipeItems.length > 0) {
      countWithRecipe++;
      totalMarginSum = totalMarginSum.add(marginPercent);

      if (marginPercent < lowestMargin.percent) {
        lowestMargin = { name: product.name, percent: marginPercent };
      }
      if (marginPercent > highestMargin.percent) {
        highestMargin = { name: product.name, percent: marginPercent };
      }
    }

    return {
      productId: product.id,
      productName: product.name,
      price: Number(price.toFixed(2)),
      recipeCost: Number(recipeCost.toFixed(2)),
      margin: Number(margin.toFixed(2)),
      marginPercent: Number(marginPercent.toFixed(2)),
      recipeItems,
    };
  });

  return {
    products: productList,
    summary: {
      averageMarginPercent: countWithRecipe > 0
        ? Number(totalMarginSum.div(countWithRecipe).toFixed(2))
        : 0,
      lowestMarginProduct: lowestMargin.percent === Infinity ? null : lowestMargin.name,
      highestMarginProduct: highestMargin.percent === -Infinity ? null : highestMargin.name,
    },
  };
}

export async function ingredientConsumption(tenantId: string, query: PeriodQuery) {
  const from = new Date(query.from);
  const to = new Date(query.to);

  const ingredients = await prisma.ingredient.findMany({
    where: { tenantId, active: true },
    select: {
      id: true,
      name: true,
      unit: true,
      currentStock: true,
      costPerUnit: true,
      movements: {
        where: { createdAt: { gte: from, lte: to } },
        select: { type: true, quantity: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  let totalCostOfGoods = new Decimal(0);

  const ingredientList = ingredients.map((ing) => {
    let totalConsumed = new Decimal(0);
    let totalPurchased = new Decimal(0);

    for (const m of ing.movements) {
      const qty = new Decimal(m.quantity.toString());
      if (m.type === 'out') {
        totalConsumed = totalConsumed.add(qty);
      } else if (m.type === 'in') {
        totalPurchased = totalPurchased.add(qty);
      }
    }

    const costPerUnit = new Decimal(ing.costPerUnit.toString());
    const costOfConsumption = totalConsumed.mul(costPerUnit);
    totalCostOfGoods = totalCostOfGoods.add(costOfConsumption);

    return {
      ingredientName: ing.name,
      unit: ing.unit,
      totalConsumed: totalConsumed.toNumber(),
      totalPurchased: totalPurchased.toNumber(),
      currentStock: Number(ing.currentStock),
      costOfConsumption: Number(costOfConsumption.toFixed(2)),
    };
  });

  return {
    ingredients: ingredientList,
    totalCostOfGoods: Number(totalCostOfGoods.toFixed(2)),
  };
}

/**
 * Average prep time (confirmed → ready) in minutes, calculated from recent orders.
 * Returns global average and per-product averages.
 */
export async function prepTimeStats(tenantId: string) {
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      confirmedAt: { not: null },
      readyAt: { not: null },
      status: { in: ['ready', 'delivered', 'paid'] },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // last 30 days
    },
    select: {
      confirmedAt: true,
      readyAt: true,
      items: { select: { productId: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  if (orders.length === 0) return { globalAvgMinutes: null, byProduct: [] };

  let totalMinutes = 0;
  const productTimes = new Map<string, { name: string; totalMin: number; count: number }>();

  for (const o of orders) {
    const mins = (o.readyAt!.getTime() - o.confirmedAt!.getTime()) / 60000;
    if (mins < 0 || mins > 240) continue; // skip anomalies
    totalMinutes += mins;

    for (const item of o.items) {
      const existing = productTimes.get(item.productId);
      if (existing) {
        existing.totalMin += mins;
        existing.count += 1;
      } else {
        productTimes.set(item.productId, { name: item.product.name, totalMin: mins, count: 1 });
      }
    }
  }

  const globalAvgMinutes = Math.round(totalMinutes / orders.length);

  const byProduct = Array.from(productTimes.entries())
    .map(([productId, data]) => ({
      productId,
      name: data.name,
      avgMinutes: Math.round(data.totalMin / data.count),
      orderCount: data.count,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 20);

  return { globalAvgMinutes, byProduct };
}
