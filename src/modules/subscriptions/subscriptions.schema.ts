import { z } from 'zod';

export const checkoutSchema = z.object({
  priceId: z.string().min(1),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
