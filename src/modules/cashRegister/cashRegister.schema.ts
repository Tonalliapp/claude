import { z } from 'zod';

export const openCashRegisterSchema = z.object({
  openingAmount: z.number().min(0),
  notes: z.string().optional(),
});

export const closeCashRegisterSchema = z.object({
  closingAmount: z.number().min(0),
  notes: z.string().optional(),
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const registerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createMovementSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'expense']),
  amount: z.number().positive(),
  description: z.string().max(255).optional(),
});

export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
