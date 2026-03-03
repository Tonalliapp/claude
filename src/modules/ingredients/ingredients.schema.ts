import { z } from 'zod';

const ingredientUnits = ['piezas', 'kg', 'g', 'lt', 'ml'] as const;

export const createIngredientSchema = z.object({
  name: z.string().min(1).max(255),
  unit: z.enum(ingredientUnits),
  costPerUnit: z.number().min(0),
  currentStock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
});

export const updateIngredientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  unit: z.enum(ingredientUnits).optional(),
  costPerUnit: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
});

export const ingredientMovementSchema = z.object({
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().positive(),
  reason: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
export type IngredientMovementInput = z.infer<typeof ingredientMovementSchema>;
