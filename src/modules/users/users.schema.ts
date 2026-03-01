import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guión y guión bajo'),
  password: z.string().min(6),
  role: z.enum(['admin', 'cashier', 'waiter', 'kitchen']),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guión y guión bajo').optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'cashier', 'waiter', 'kitchen']).optional(),
  active: z.boolean().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
