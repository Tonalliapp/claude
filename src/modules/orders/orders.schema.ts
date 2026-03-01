import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().uuid(),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'preparing', 'ready', 'delivered', 'paid', 'cancelled']),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const updateItemStatusSchema = z.object({
  status: z.enum(['preparing', 'ready', 'delivered']),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const orderItemParamSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
});

export const listQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'paid', 'cancelled']).optional(),
  tableId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
