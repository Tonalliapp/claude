import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { processImage } from '../../utils/imageProcessor';
import { uploadToStorage } from '../../utils/uploadFile';
import type { CreateProductInput, UpdateProductInput } from './products.schema';

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
