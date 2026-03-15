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

const templateEnum = z.enum([
  'classic-gold', 'midnight-blue', 'wine-rose', 'champagne', 'clean-white',
  'slate', 'forest', 'ocean', 'neon-pop', 'sunset', 'pastel-dream',
  'tropical', 'minimal-dark', 'minimal-light', 'warm-cream',
  // New templates
  'emerald-gold', 'royal-purple', 'copper-noir', 'arctic', 'terracotta',
  'lavender-mist', 'cherry-blossom', 'carbon', 'sage-linen', 'electric-blue',
  // Fun templates (with patterns)
  'confetti', 'polka-dots', 'stripes', 'waves', 'zigzag', 'diamonds', 'bubbles', 'stars',
  // Low poly / geometric
  'crystal-night', 'amber-geo', 'emerald-facets', 'rose-quartz', 'ice-crystal', 'volcanic',
]);

const fontEnum = z.enum(['playfair', 'cormorant', 'montserrat', 'raleway', 'poppins', 'inter']);
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const brandedQRBase = {
  template: templateEnum.default('classic-gold'),
  font: fontEnum.default('playfair'),
  title: z.string().max(60).default(''),
  subtitle: z.string().max(80).default(''),
  callToAction: z.string().max(80).default(''),
  showTableNumber: z.boolean().default(true),
  logoSize: z.number().min(10).max(50).default(30),
  logoPosition: z.enum(['top', 'center', 'bottom']).default('top'),
  logoShape: z.enum(['original', 'circle', 'rounded']).default('original'),
  qrSize: z.number().min(30).max(70).default(45),
  qrStyle: z.enum(['square', 'rounded', 'dots']).default('square'),
  showDecorations: z.boolean().default(true),
  bgColor: z.string().regex(hexColorRegex).optional(),
  accentColor: z.string().regex(hexColorRegex).optional(),
  textColor: z.string().regex(hexColorRegex).optional(),
};

export const brandedQRSchema = z.object({
  ...brandedQRBase,
  format: z.enum(['png', 'pdf']).default('png'),
});

export const batchQRSchema = z.object({
  ...brandedQRBase,
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type BrandedQRInput = z.infer<typeof brandedQRSchema>;
export type BatchQRInput = z.infer<typeof batchQRSchema>;
