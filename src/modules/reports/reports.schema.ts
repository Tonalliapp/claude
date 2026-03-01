import { z } from 'zod';

export const periodQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const topProductsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type PeriodQuery = z.infer<typeof periodQuerySchema>;
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>;
