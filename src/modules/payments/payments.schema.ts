import { z } from 'zod';

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(['cash', 'card', 'transfer']),
  amount: z.number().positive(),
  reference: z.string().max(255).optional(),
});

export const listPaymentsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  method: z.enum(['cash', 'card', 'transfer']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
