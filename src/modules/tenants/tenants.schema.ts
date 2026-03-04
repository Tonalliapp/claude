import { z } from 'zod';

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: z.record(z.string(), z.any()).optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const toggleYessweraSchema = z.object({
  enabled: z.boolean(),
});
