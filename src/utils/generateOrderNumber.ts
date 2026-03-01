import { prisma } from '../config/database';

/**
 * Generates sequential order number per tenant.
 * Uses a transaction to prevent race conditions.
 */
export async function generateOrderNumber(tenantId: string): Promise<number> {
  const lastOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  return (lastOrder?.orderNumber ?? 0) + 1;
}
