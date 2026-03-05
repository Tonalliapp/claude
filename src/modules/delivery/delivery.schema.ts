import { z } from 'zod';

const deliveryItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const createDeliveryOrderSchema = z.object({
  slug: z.string().min(1).max(100),
  externalOrderId: z.string().uuid(),
  items: z.array(deliveryItemSchema).min(1),
  customerName: z.string().max(255),
  customerPhone: z.string().max(20),
  deliveryAddress: z.string().max(500),
  notes: z.string().optional(),
});

export const deliveryWebhookSchema = z.object({
  slug: z.string().min(1).max(100),
  event: z.enum([
    'driver_assigned',
    'driver_verified',
    'picked_up',
    'in_transit',
    'arrived',
    'delivered',
    'cancelled',
    'debt_created',
    'debt_settled',
  ]),
  externalOrderId: z.string(),
  data: z.object({
    driverName: z.string().optional(),
    driverPhone: z.string().optional(),
    driverVehicle: z.string().optional(),
    estimatedMinutes: z.number().optional(),
    deliveredAt: z.string().optional(),
    reason: z.string().optional(),
    driverCode: z.string().optional(),
    pickupCode: z.string().optional(),
    deliveryCodeUsed: z.boolean().optional(),
    deliveryVerifiedAt: z.string().optional(),
    orderId: z.string().optional(),
    foodAmount: z.number().optional(),
    totalAccumulatedDebt: z.number().optional(),
    trustTier: z.string().optional(),
    amountSettled: z.number().optional(),
    paymentMethod: z.string().optional(),
    remainingDebt: z.number().optional(),
    ordersCount: z.number().optional(),
  }).default({}),
});

export const getOrderParamSchema = z.object({
  id: z.string().uuid(),
});

export const confirmPickupSchema = z.object({
  driverCode: z.string().min(1).max(10),
});

export const confirmDebtPaymentSchema = z.object({
  driverName: z.string().min(1),
  driverPhone: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'transfer']).optional().default('cash'),
});

export type CreateDeliveryOrderInput = z.infer<typeof createDeliveryOrderSchema>;
export type DeliveryWebhookInput = z.infer<typeof deliveryWebhookSchema>;
export type ConfirmDebtPaymentInput = z.infer<typeof confirmDebtPaymentSchema>;
