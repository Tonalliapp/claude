import { prisma } from '../config/database';

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateUniqueSlug(name: string): Promise<string> {
  let slug = slugify(name);

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (!existing) return slug;

  // Add numeric suffix until unique
  let counter = 2;
  while (true) {
    const candidate = `${slug}-${counter}`;
    const found = await prisma.tenant.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
    counter++;
  }
}
