import { z } from 'zod';

export const aiChatSchema = z.object({
  context: z.enum(['restaurant_client', 'restaurant_staff', 'delivery_client', 'delivery_driver']),
  message: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(10).optional(),
});

export type AiChatInput = z.infer<typeof aiChatSchema>;
