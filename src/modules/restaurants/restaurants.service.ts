import { prisma } from '../../config/database';

interface NearbyRestaurant {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
  address: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  distance: number;
  config: unknown;
}

export async function findNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  businessType?: string
): Promise<NearbyRestaurant[]> {
  const typeFilter = businessType
    ? `AND t.business_type = $4`
    : '';

  const params: unknown[] = [lat, lng, radiusKm];
  if (businessType) params.push(businessType);

  const results = await prisma.$queryRawUnsafe<NearbyRestaurant[]>(`
    SELECT * FROM (
      SELECT id, name, slug, business_type as "businessType", address, phone, latitude, longitude, config,
        (6371 * acos(
          LEAST(1.0, cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude)))
        )) AS distance
      FROM tenants t
      WHERE t.status = 'active'
        AND t.latitude IS NOT NULL
        AND t.longitude IS NOT NULL
        ${typeFilter}
    ) sub
    WHERE distance <= $3
    ORDER BY distance
    LIMIT 50
  `, ...params);

  return results;
}

export async function getBySlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      address: true,
      phone: true,
      latitude: true,
      longitude: true,
      config: true,
      categories: {
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          products: {
            where: { available: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  return tenant;
}
