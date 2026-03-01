import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schema';

export async function list(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function create(tenantId: string, data: CreateCategoryInput) {
  return prisma.category.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function update(tenantId: string, id: string, data: UpdateCategoryInput) {
  const category = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!category) throw new AppError(404, 'Categoría no encontrada', 'NOT_FOUND');

  return prisma.category.update({ where: { id }, data });
}

export async function remove(tenantId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!category) throw new AppError(404, 'Categoría no encontrada', 'NOT_FOUND');

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw new AppError(409, `No se puede eliminar: tiene ${productCount} productos`, 'HAS_PRODUCTS');
  }

  return prisma.category.delete({ where: { id } });
}

export async function reorder(tenantId: string, ids: string[]) {
  const updates = ids.map((id, index) =>
    prisma.category.updateMany({
      where: { id, tenantId },
      data: { sortOrder: index },
    }),
  );
  await prisma.$transaction(updates);
}
