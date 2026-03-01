import { z } from 'zod';

export const updateInventorySchema = z.object({
  currentStock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
});

export const movementSchema = z.object({
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().positive(),
  reason: z.string().optional(),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});

export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type MovementInput = z.infer<typeof movementSchema>;
