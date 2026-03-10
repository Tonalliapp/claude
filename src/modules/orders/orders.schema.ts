import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().uuid().optional(),
  orderType: z.enum(['dine_in', 'takeout', 'counter', 'delivery']).default('dine_in'),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
  customerName: z.string().max(255).optional(),
}).refine(
  (data) => data.orderType !== 'dine_in' || !!data.tableId,
  { message: 'Mesa requerida para pedidos en mesa', path: ['tableId'] },
);

export const createPosOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  orderType: z.enum(['takeout', 'counter', 'delivery']).default('counter'),
  customerName: z.string().max(255).optional(),
  notes: z.string().optional(),
  payImmediately: z.boolean().default(true),
  paymentMethod: z.enum(['cash', 'card', 'transfer']).default('cash'),
  paymentReference: z.string().max(255).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
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
  source: z.enum(['tonalli', 'yesswera']).optional(),
  orderType: z.enum(['dine_in', 'takeout', 'counter', 'delivery']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreatePosOrderInput = z.infer<typeof createPosOrderSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
