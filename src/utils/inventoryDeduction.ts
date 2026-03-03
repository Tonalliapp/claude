import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database';
import { getIO } from '../websocket/socket';
import { tenantRoom } from '../websocket/rooms';

interface DeductionItem {
  productId: string;
  quantity: number;
}

/**
 * Auto-deduct inventory for products with trackStock=true.
 * Never blocks the sale — if stock goes negative, emits an alert instead.
 */
export async function deductInventory(
  tenantId: string,
  items: DeductionItem[],
  orderNumber: number | string,
): Promise<void> {
  const productIds = items.map((i) => i.productId);

  // Fetch products that track stock and have inventory configured
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId, trackStock: true },
    select: { id: true, name: true, inventory: true },
  });

  if (products.length === 0) return;

  const io = getIO();

  for (const product of products) {
    if (!product.inventory) continue;

    const item = items.find((i) => i.productId === product.id);
    if (!item) continue;

    const inventory = product.inventory;
    const qty = new Decimal(item.quantity);
    const newStock = new Decimal(inventory.currentStock.toString()).sub(qty);

    // Create movement and update stock atomically
    await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: 'out',
          quantity: item.quantity,
          reason: `Venta #${orderNumber}`,
        },
      }),
      prisma.inventory.update({
        where: { id: inventory.id },
        data: { currentStock: newStock },
      }),
    ]);

    // Emit alert if stock is at or below minimum
    if (newStock.lessThanOrEqualTo(inventory.minStock)) {
      io.of('/staff')
        .to(tenantRoom(tenantId))
        .emit('inventory:alert', {
          productId: product.id,
          productName: product.name,
          currentStock: newStock.toNumber(),
          minStock: Number(inventory.minStock),
        });
    }
  }
}
