import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getIO } from '../../websocket/socket';
import { tenantRoom } from '../../websocket/rooms';
import type {
  CreateIngredientInput,
  UpdateIngredientInput,
  IngredientMovementInput,
} from './ingredients.schema';

export async function list(tenantId: string) {
  return prisma.ingredient.findMany({
    where: { tenantId, active: true },
    orderBy: { name: 'asc' },
  });
}

export async function getById(tenantId: string, id: string) {
  const ingredient = await prisma.ingredient.findFirst({
    where: { id, tenantId },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ingredient) throw new AppError(404, 'Ingrediente no encontrado', 'NOT_FOUND');
  return ingredient;
}

export async function findByBarcode(tenantId: string, barcode: string) {
  const ingredient = await prisma.ingredient.findFirst({
    where: { tenantId, barcode },
  });
  if (!ingredient) throw new AppError(404, 'Ingrediente no encontrado con ese código de barras', 'NOT_FOUND');
  return ingredient;
}

export async function create(tenantId: string, data: CreateIngredientInput) {
  const existing = await prisma.ingredient.findUnique({
    where: { tenantId_name: { tenantId, name: data.name } },
  });
  if (existing) throw new AppError(409, 'Ya existe un ingrediente con ese nombre', 'DUPLICATE');

  return prisma.ingredient.create({
    data: {
      tenantId,
      name: data.name,
      unit: data.unit,
      costPerUnit: data.costPerUnit,
      currentStock: data.currentStock ?? 0,
      minStock: data.minStock ?? 0,
      barcode: data.barcode,
    },
  });
}

export async function update(tenantId: string, id: string, data: UpdateIngredientInput) {
  const ingredient = await prisma.ingredient.findFirst({ where: { id, tenantId } });
  if (!ingredient) throw new AppError(404, 'Ingrediente no encontrado', 'NOT_FOUND');

  if (data.name && data.name !== ingredient.name) {
    const existing = await prisma.ingredient.findUnique({
      where: { tenantId_name: { tenantId, name: data.name } },
    });
    if (existing) throw new AppError(409, 'Ya existe un ingrediente con ese nombre', 'DUPLICATE');
  }

  return prisma.ingredient.update({ where: { id }, data });
}

export async function remove(tenantId: string, id: string) {
  const ingredient = await prisma.ingredient.findFirst({ where: { id, tenantId } });
  if (!ingredient) throw new AppError(404, 'Ingrediente no encontrado', 'NOT_FOUND');

  const usedInRecipes = await prisma.recipeItem.count({ where: { ingredientId: id } });
  if (usedInRecipes > 0) {
    throw new AppError(
      409,
      'No se puede eliminar: el ingrediente se usa en recetas',
      'IN_USE',
    );
  }

  // Soft-delete: set active=false (preserves movement history)
  return prisma.ingredient.update({
    where: { id },
    data: { active: false },
  });
}

export async function getAlerts(tenantId: string) {
  const ingredients = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      unit: string;
      current_stock: Decimal;
      min_stock: Decimal;
      cost_per_unit: Decimal;
    }>
  >`
    SELECT id, name, unit, current_stock, min_stock, cost_per_unit
    FROM ingredients
    WHERE tenant_id = ${tenantId}::uuid
      AND active = true
      AND current_stock <= min_stock
    ORDER BY name ASC
  `;

  return ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    currentStock: Number(i.current_stock),
    minStock: Number(i.min_stock),
    costPerUnit: Number(i.cost_per_unit),
  }));
}

export async function addMovement(
  tenantId: string,
  id: string,
  data: IngredientMovementInput,
  userId: string,
) {
  const ingredient = await prisma.ingredient.findFirst({ where: { id, tenantId } });
  if (!ingredient) throw new AppError(404, 'Ingrediente no encontrado', 'NOT_FOUND');

  const current = new Decimal(ingredient.currentStock.toString());
  const qty = new Decimal(data.quantity);
  let newStock: Decimal;

  if (data.type === 'adjustment') {
    newStock = qty;
  } else if (data.type === 'in') {
    newStock = current.add(qty);
  } else {
    newStock = current.sub(qty);
    if (newStock.lessThan(0)) {
      throw new AppError(400, 'Stock insuficiente', 'INSUFFICIENT_STOCK');
    }
  }

  const [movement] = await prisma.$transaction([
    prisma.ingredientMovement.create({
      data: {
        ingredientId: id,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
        userId,
      },
    }),
    prisma.ingredient.update({
      where: { id },
      data: { currentStock: newStock },
    }),
  ]);

  // Emit alert if stock at or below minimum
  if (newStock.lessThanOrEqualTo(ingredient.minStock)) {
    const io = getIO();
    io.of('/staff')
      .to(tenantRoom(tenantId))
      .emit('ingredient:alert', {
        ingredientId: id,
        ingredientName: ingredient.name,
        currentStock: newStock.toNumber(),
        minStock: Number(ingredient.minStock),
      });
  }

  return {
    movement,
    currentStock: newStock.toNumber(),
  };
}
