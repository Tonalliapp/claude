import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export async function getMenuBySlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      config: true,
    },
  });

  if (!tenant) throw new AppError(404, 'Restaurante no encontrado', 'NOT_FOUND');

  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      products: {
        where: { available: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          available: true,
        },
      },
    },
  });

  return { restaurant: tenant, categories };
}

export async function getTableInfo(slug: string, tableNumber: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, logoUrl: true, config: true },
  });

  if (!tenant) throw new AppError(404, 'Restaurante no encontrado', 'NOT_FOUND');

  const table = await prisma.table.findUnique({
    where: { tenantId_number: { tenantId: tenant.id, number: tableNumber } },
    select: { id: true, number: true, status: true, capacity: true },
  });

  if (!table) throw new AppError(404, 'Mesa no encontrada', 'TABLE_NOT_FOUND');

  return { restaurant: tenant, table };
}
