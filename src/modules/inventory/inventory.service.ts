import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getIO } from '../../websocket/socket';
import { tenantRoom } from '../../websocket/rooms';
import type { UpdateInventoryInput, MovementInput } from './inventory.schema';

export async function list(tenantId: string) {
  return prisma.inventory.findMany({
    where: { tenantId },
    include: { product: { select: { id: true, name: true, available: true } } },
    orderBy: { product: { name: 'asc' } },
  });
}

export async function upsert(tenantId: string, productId: string, data: UpdateInventoryInput) {
  // Verify product belongs to tenant
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND');

  return prisma.inventory.upsert({
    where: { productId },
    create: {
      tenantId,
      productId,
      currentStock: data.currentStock ?? 0,
      minStock: data.minStock ?? 0,
      unit: data.unit ?? 'piezas',
    },
    update: data,
    include: { product: { select: { id: true, name: true } } },
  });
}

export async function addMovement(
  tenantId: string,
  productId: string,
  data: MovementInput,
  userId: string,
) {
  const inventory = await prisma.inventory.findFirst({
    where: { productId, tenantId },
  });

  if (!inventory) {
    throw new AppError(404, 'Inventario no configurado para este producto', 'NOT_FOUND');
  }

  const quantityChange =
    data.type === 'out'
      ? new Decimal(data.quantity).neg()
      : new Decimal(data.quantity);

  if (data.type === 'adjustment') {
    // Adjustment sets absolute value
    const [movement] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason,
          userId,
        },
      }),
      prisma.inventory.update({
        where: { id: inventory.id },
        data: { currentStock: data.quantity },
      }),
    ]);
    return movement;
  }

  const newStock = new Decimal(inventory.currentStock.toString()).add(quantityChange);
  if (newStock.lessThan(0)) {
    throw new AppError(400, 'Stock insuficiente', 'INSUFFICIENT_STOCK');
  }

  const [movement] = await prisma.$transaction([
    prisma.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
        userId,
      },
    }),
    prisma.inventory.update({
      where: { id: inventory.id },
      data: { currentStock: newStock },
    }),
  ]);

  // Check low stock alert
  if (newStock.lessThanOrEqualTo(inventory.minStock)) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    getIO()
      .of('/staff')
      .to(tenantRoom(tenantId))
      .emit('inventory:alert', {
        productId,
        productName: product?.name,
        currentStock: newStock.toNumber(),
        minStock: inventory.minStock,
      });
  }

  return movement;
}

export async function getAlerts(tenantId: string) {
  const items = await prisma.inventory.findMany({
    where: { tenantId },
    include: { product: { select: { id: true, name: true, available: true } } },
  });

  return items.filter((i) =>
    new Decimal(i.currentStock.toString()).lessThanOrEqualTo(i.minStock),
  );
}
