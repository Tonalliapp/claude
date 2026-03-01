import { z } from 'zod';

export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  available: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  available: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const availabilitySchema = z.object({
  available: z.boolean(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const reorderProductsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
