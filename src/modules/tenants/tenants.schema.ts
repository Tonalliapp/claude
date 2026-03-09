import { z } from 'zod';

const tenantConfigSchema = z.object({
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  currency: z.string().max(5).optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().max(50).optional(),
  ivaEnabled: z.boolean().optional(),
  ivaRate: z.number().min(0).max(100).optional(),
}).strict();

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: tenantConfigSchema.optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const toggleYessweraSchema = z.object({
  enabled: z.boolean(),
});
