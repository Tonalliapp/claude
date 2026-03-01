import { z } from 'zod';

export const openCashRegisterSchema = z.object({
  openingAmount: z.number().min(0),
  notes: z.string().optional(),
});

export const closeCashRegisterSchema = z.object({
  closingAmount: z.number().min(0),
  notes: z.string().optional(),
});

export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
