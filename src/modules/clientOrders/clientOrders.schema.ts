import { z } from 'zod';

const clientOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const createClientOrderSchema = z.object({
  slug: z.string().min(1),
  tableNumber: z.number().int().positive(),
  items: z.array(clientOrderItemSchema).min(1),
  notes: z.string().optional(),
});

export const clientOrderIdSchema = z.object({
  id: z.string().uuid(),
});

export const requestBillSchema = z.object({
  slug: z.string().min(1),
  tableNumber: z.number().int().positive(),
});

export const callWaiterSchema = z.object({
  slug: z.string().min(1),
  tableNumber: z.number().int().positive(),
  reason: z.string().max(200).optional(),
});

export type CreateClientOrderInput = z.infer<typeof createClientOrderSchema>;
export type RequestBillInput = z.infer<typeof requestBillSchema>;
export type CallWaiterInput = z.infer<typeof callWaiterSchema>;
