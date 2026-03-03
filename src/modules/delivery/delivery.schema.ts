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
  ]),
  externalOrderId: z.string().uuid(),
  data: z.object({
    driverName: z.string().optional(),
    driverPhone: z.string().optional(),
    driverVehicle: z.string().optional(),
    estimatedMinutes: z.number().optional(),
    deliveredAt: z.string().optional(),
    reason: z.string().optional(),
  }).default({}),
});

export const getOrderParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateDeliveryOrderInput = z.infer<typeof createDeliveryOrderSchema>;
export type DeliveryWebhookInput = z.infer<typeof deliveryWebhookSchema>;
