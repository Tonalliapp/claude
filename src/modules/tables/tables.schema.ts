import { z } from 'zod';

export const createTableSchema = z.object({
  number: z.number().int().positive(),
  capacity: z.number().int().positive().optional(),
});

export const updateTableSchema = z.object({
  number: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const statusSchema = z.object({
  status: z.enum(['free', 'occupied', 'ordering', 'bill', 'reserved']),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const customQRSchema = z.object({
  /** QR size as percentage of canvas: 40-80 */
  qrSize: z.number().min(40).max(80).default(60),
  /** Preset position */
  position: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).default('center'),
  /** Custom X position (0-100%). Overrides position if both customX and customY are provided */
  customX: z.number().min(0).max(100).optional(),
  /** Custom Y position (0-100%). Overrides position if both customX and customY are provided */
  customY: z.number().min(0).max(100).optional(),
  /** QR opacity: 0.5-1.0 */
  opacity: z.number().min(0.5).max(1.0).default(0.92),
  /** Output image size in pixels: 512-2048 */
  canvasSize: z.number().int().min(512).max(2048).default(1024),
  /** Show table number label below QR */
  showTableNumber: z.boolean().default(true),
});

export const brandedQRSchema = z.object({
  layout: z.enum(['logo-left', 'logo-right']).default('logo-left'),
  showTableNumber: z.boolean().default(true),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type CustomQRInput = z.infer<typeof customQRSchema>;
export type BrandedQRInput = z.infer<typeof brandedQRSchema>;
