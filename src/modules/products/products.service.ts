import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { processImage } from '../../utils/imageProcessor';
import { uploadToStorage } from '../../utils/uploadFile';
import { convertUnits } from '../../utils/unitConversion';
import type { CreateProductInput, UpdateProductInput, SetRecipeInput } from './products.schema';

export async function list(tenantId: string, categoryId?: string) {
  return prisma.product.findMany({
    where: { tenantId, ...(categoryId ? { categoryId } : {}) },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function getById(tenantId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: { id, tenantId },
    include: { category: { select: { id: true, name: true } }, inventory: true },
  });
  if (!product) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND');
  return product;
}

export async function create(tenantId: string, data: CreateProductInput) {
  // Check plan limits
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError(404, 'Tenant not found', 'NOT_FOUND');

  const count = await prisma.product.count({ where: { tenantId } });
  if (count >= tenant.maxProducts) {
    throw new AppError(403, `Límite de productos alcanzado (${tenant.maxProducts})`, 'PLAN_LIMIT');
  }

  // Verify category belongs to tenant
  const category = await prisma.category.findFirst({ where: { id: data.categoryId, tenantId } });
  if (!category) throw new AppError(404, 'Categoría no encontrada', 'CATEGORY_NOT_FOUND');

  return prisma.product.create({
    data: {
      tenantId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      available: data.available ?? true,
      trackStock: data.trackStock ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
    include: { category: { select: { id: true, name: true } } },
  });
}

export async function update(tenantId: string, id: string, data: UpdateProductInput) {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!product) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND');

  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, tenantId } });
    if (!category) throw new AppError(404, 'Categoría no encontrada', 'CATEGORY_NOT_FOUND');
  }

  return prisma.product.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true } } },
  });
}

export async function remove(tenantId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!product) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND');

  return prisma.product.delete({ where: { id } });
}

export async function toggleAvailability(tenantId: string, id: string, available: boolean) {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!product) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND');

  return prisma.product.update({
    where: { id },
    data: { available },
  });
}

export async function reorder(tenantId: string, ids: string[]) {
  const updates = ids.map((id, index) =>
    prisma.product.updateMany({
      where: { id, tenantId },
      data: { sortOrder: index },
    }),
  );
  await prisma.$transaction(updates);
}

export async function uploadImage(tenantId: string, id: string, fileBuffer: Buffer) {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!product) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND');

  const processed = await processImage(fileBuffer);
  const imageUrl = await uploadToStorage(
    processed.buffer,
    `products/${tenantId}`,
    processed.mimetype,
    processed.extension,
  );

  return prisma.product.update({
    where: { id },
    data: { imageUrl },
  });
}

export async function getRecipe(tenantId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND');

  const items = await prisma.recipeItem.findMany({
    where: { productId },
    include: { ingredient: { select: { id: true, name: true, unit: true, costPerUnit: true } } },
  });

  let recipeCost = new Decimal(0);
  const recipeItems = items.map((item) => {
    const costPerUnit = new Decimal(item.ingredient.costPerUnit.toString());
    const qty = new Decimal(item.quantity.toString());
    // Convert recipe quantity to ingredient's unit, then multiply by costPerUnit
    const convertedQty = convertUnits(qty.toNumber(), item.unit, item.ingredient.unit);
    const lineCost = costPerUnit.mul(convertedQty);
    recipeCost = recipeCost.add(lineCost);

    return {
      id: item.id,
      ingredientId: item.ingredientId,
      ingredientName: item.ingredient.name,
      ingredientUnit: item.ingredient.unit,
      quantity: Number(item.quantity),
      unit: item.unit,
      lineCost: lineCost.toNumber(),
    };
  });

  return {
    productId,
    productName: product.name,
    price: Number(product.price),
    recipeCost: recipeCost.toNumber(),
    margin: new Decimal(product.price.toString()).sub(recipeCost).toNumber(),
    marginPercent: Number(product.price) > 0
      ? new Decimal(product.price.toString()).sub(recipeCost).div(product.price.toString()).mul(100).toNumber()
      : 0,
    items: recipeItems,
  };
}

export async function setRecipe(tenantId: string, productId: string, data: SetRecipeInput) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND');

  // Validate all ingredients exist and belong to tenant
  const ingredientIds = data.items.map((i) => i.ingredientId);
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds }, tenantId },
  });

  if (ingredients.length !== ingredientIds.length) {
    throw new AppError(400, 'Uno o mas ingredientes no encontrados', 'INGREDIENT_NOT_FOUND');
  }

  // Validate unit compatibility
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
  for (const item of data.items) {
    const ingredient = ingredientMap.get(item.ingredientId)!;
    try {
      convertUnits(1, item.unit, ingredient.unit);
    } catch {
      throw new AppError(
        400,
        `Unidad incompatible para ${ingredient.name}: ${item.unit} no se puede convertir a ${ingredient.unit}`,
        'UNIT_MISMATCH',
      );
    }
  }

  // Full replace: delete existing + create new
  await prisma.$transaction([
    prisma.recipeItem.deleteMany({ where: { productId } }),
    ...data.items.map((item) =>
      prisma.recipeItem.create({
        data: {
          productId,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
        },
      }),
    ),
  ]);

  return getRecipe(tenantId, productId);
}

export async function deleteRecipe(tenantId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new AppError(404, 'Producto no encontrado', 'NOT_FOUND');

  await prisma.recipeItem.deleteMany({ where: { productId } });
}
