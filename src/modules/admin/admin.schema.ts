import { z } from 'zod';

export const superadminLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  plan: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  status: z.enum(['active', 'suspended', 'cancelled']).optional(),
  plan: z.enum(['basic', 'professional', 'premium']).optional(),
  maxTables: z.number().int().min(1).optional(),
  maxUsers: z.number().int().min(1).optional(),
  maxProducts: z.number().int().min(1).optional(),
});

export const updateUserSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(['owner', 'admin', 'cashier', 'waiter', 'kitchen']).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type SuperadminLoginInput = z.infer<typeof superadminLoginSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
