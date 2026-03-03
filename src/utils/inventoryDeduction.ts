import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database';
import { getIO } from '../websocket/socket';
import { tenantRoom } from '../websocket/rooms';
import { convertUnits } from './unitConversion';

interface DeductionItem {
  productId: string;
  quantity: number;
}

/**
 * Auto-deduct inventory for order items.
 * Two branches:
 *   1. Product has recipeItems → deduct from ingredients
 *   2. Product has trackStock + Inventory → deduct from product inventory (legacy)
 * Never blocks the sale — if stock goes negative, emits an alert instead.
 */
export async function deductInventory(
  tenantId: string,
  items: DeductionItem[],
  orderNumber: number | string,
): Promise<void> {
  const productIds = items.map((i) => i.productId);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId },
    select: {
      id: true,
      name: true,
      trackStock: true,
      inventory: true,
      recipeItems: {
        include: { ingredient: true },
      },
    },
  });

  if (products.length === 0) return;

  const io = getIO();

  for (const product of products) {
    const item = items.find((i) => i.productId === product.id);
    if (!item) continue;

    // Branch 1: Recipe-based deduction
    if (product.recipeItems.length > 0) {
      for (const recipeItem of product.recipeItems) {
        const ingredient = recipeItem.ingredient;
        const recipeQty = new Decimal(recipeItem.quantity.toString()).mul(item.quantity);

        // Convert from recipe unit to ingredient's storage unit
        const convertedQty = convertUnits(
          recipeQty.toNumber(),
          recipeItem.unit,
          ingredient.unit,
        );
        const deductAmount = new Decimal(convertedQty);
        const currentStock = new Decimal(ingredient.currentStock.toString());
        const newStock = currentStock.sub(deductAmount);

        await prisma.$transaction([
          prisma.ingredientMovement.create({
            data: {
              ingredientId: ingredient.id,
              type: 'out',
              quantity: deductAmount,
              reason: `Venta #${orderNumber} - ${product.name}`,
            },
          }),
          prisma.ingredient.update({
            where: { id: ingredient.id },
            data: { currentStock: newStock },
          }),
        ]);

        if (newStock.lessThanOrEqualTo(ingredient.minStock)) {
          io.of('/staff')
            .to(tenantRoom(tenantId))
            .emit('ingredient:alert', {
              ingredientId: ingredient.id,
              ingredientName: ingredient.name,
              currentStock: newStock.toNumber(),
              minStock: Number(ingredient.minStock),
            });
        }
      }
      continue;
    }

    // Branch 2: Legacy product-inventory deduction (trackStock required)
    if (!product.trackStock || !product.inventory) continue;

    const inventory = product.inventory;
    const qty = new Decimal(item.quantity);
    const newStock = new Decimal(inventory.currentStock.toString()).sub(qty);

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
