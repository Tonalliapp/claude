import { z } from 'zod';

export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  barcode: z.string().max(50).optional(),
  available: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  barcode: z.string().max(50).nullable().optional(),
  available: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const barcodeParamSchema = z.object({
  barcode: z.string().min(1).max(50),
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

const ingredientUnits = ['piezas', 'kg', 'g', 'lt', 'ml'] as const;

export const setRecipeSchema = z.object({
  items: z.array(
    z.object({
      ingredientId: z.string().uuid(),
      quantity: z.number().positive(),
      unit: z.enum(ingredientUnits),
    }),
  ).min(1),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SetRecipeInput = z.infer<typeof setRecipeSchema>;
