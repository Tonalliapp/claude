import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Superadmin ────────────────────────────────
  const existingSuperadmin = await prisma.user.findFirst({
    where: { email: 'admin@tonalli.app', role: 'superadmin' },
  });
  if (!existingSuperadmin) {
    const superadminHash = await bcrypt.hash('Tonalli2026!', 12);
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        username: 'superadmin',
        email: 'admin@tonalli.app',
        passwordHash: superadminHash,
        role: 'superadmin',
        tenantId: null,
      },
    });
    console.log('  Superadmin: admin@tonalli.app (superadmin)');
  } else {
    console.log('  Superadmin: already exists');
  }

  // ─── Tenant ─────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'la-cocina-de-maria' },
    update: {},
    create: {
      name: 'La Cocina de María',
      slug: 'la-cocina-de-maria',
      plan: 'professional',
      status: 'active',
      maxTables: 30,
      maxUsers: 10,
      maxProducts: 200,
      config: {
        currency: 'MXN',
        timezone: 'America/Mexico_City',
        address: 'Tomatlán, Jalisco, México',
      },
    },
  });
  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);

  // ─── Owner User ─────────────────────────────────
  const passwordHash = await bcrypt.hash('Tonalli2026!', 12);
  const owner = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Carlos Valenzuela',
      username: 'admin',
      email: 'carlos@tonalli.app',
      passwordHash,
      role: 'owner',
    },
  });
  console.log(`  Owner: ${owner.name} (@${owner.username})`);

  // ─── Staff Users ────────────────────────────────
  const staffUsers = [
    { name: 'Ana García', username: 'ana', role: 'admin' as const },
    { name: 'Pedro López', username: 'pedro', role: 'cashier' as const },
    { name: 'María Hernández', username: 'maria', role: 'waiter' as const },
    { name: 'José Ramírez', username: 'jose', role: 'kitchen' as const },
  ];

  const demoHash = await bcrypt.hash('demo1234', 12);
  for (const user of staffUsers) {
    await prisma.user.upsert({
      where: { tenantId_username: { tenantId: tenant.id, username: user.username } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: user.name,
        username: user.username,
        passwordHash: demoHash,
        role: user.role,
      },
    });
    console.log(`  User: ${user.name} (@${user.username} / ${user.role})`);
  }

  // ─── Categories ─────────────────────────────────
  const categoriesData = [
    { name: 'Entradas', description: 'Para abrir el apetito', sortOrder: 0 },
    { name: 'Plato Fuerte', description: 'Lo mejor de la casa', sortOrder: 1 },
    { name: 'Bebidas', description: 'Refrescantes y deliciosas', sortOrder: 2 },
    { name: 'Postres', description: 'El broche de oro', sortOrder: 3 },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: { tenantId: tenant.id, ...cat },
    });
    categories[cat.name] = created.id;
    console.log(`  Category: ${cat.name}`);
  }

  // ─── Products ───────────────────────────────────
  const products = [
    // Entradas
    { name: 'Guacamole con Totopos', description: 'Aguacate fresco machacado con chile serrano, cebolla, cilantro y limón', price: 95, category: 'Entradas' },
    { name: 'Sopa Azteca', description: 'Caldo de jitomate con chile pasilla, aguacate, queso y tortilla crujiente', price: 85, category: 'Entradas' },
    { name: 'Quesadillas de Flor de Calabaza', description: 'Tortilla de maíz con queso Oaxaca y flor de calabaza', price: 75, category: 'Entradas' },
    { name: 'Elotes Preparados', description: 'Elote asado con mayonesa, chile en polvo, limón y queso cotija', price: 55, category: 'Entradas' },

    // Plato Fuerte
    { name: 'Enchiladas Suizas', description: 'Tortillas rellenas de pollo bañadas en salsa verde cremosa con queso gratinado', price: 145, category: 'Plato Fuerte' },
    { name: 'Mole Poblano con Pollo', description: 'Pieza de pollo bañada en mole tradicional con ajonjolí, arroz y frijoles', price: 175, category: 'Plato Fuerte' },
    { name: 'Tacos al Pastor', description: 'Orden de 4 tacos de cerdo adobado con piña, cebolla y cilantro', price: 120, category: 'Plato Fuerte' },
    { name: 'Chiles Rellenos', description: 'Chile poblano relleno de queso o picadillo, capeado y bañado en caldillo de jitomate', price: 155, category: 'Plato Fuerte' },
    { name: 'Pozole Rojo', description: 'Caldo de maíz cacahuazintle con carne de cerdo, lechuga, rábano y orégano', price: 135, category: 'Plato Fuerte' },
    { name: 'Arrachera a la Parrilla', description: 'Corte de res marinado con guarnición de nopales, cebollitas y guacamole', price: 225, category: 'Plato Fuerte' },

    // Bebidas
    { name: 'Agua de Horchata', description: 'Bebida de arroz con canela y vainilla', price: 35, category: 'Bebidas' },
    { name: 'Agua de Jamaica', description: 'Infusión de flor de jamaica con un toque de limón', price: 35, category: 'Bebidas' },
    { name: 'Limonada Natural', description: 'Limón fresco exprimido con agua mineral o natural', price: 40, category: 'Bebidas' },
    { name: 'Café de Olla', description: 'Café preparado con piloncillo y canela al estilo tradicional', price: 45, category: 'Bebidas' },

    // Postres
    { name: 'Flan Napolitano', description: 'Flan cremoso de vainilla con caramelo', price: 65, category: 'Postres' },
    { name: 'Churros con Chocolate', description: 'Churros crujientes espolvoreados con azúcar y canela, con chocolate caliente', price: 75, category: 'Postres' },
    { name: 'Pastel de Tres Leches', description: 'Bizcocho esponjoso bañado en tres leches con crema batida', price: 85, category: 'Postres' },
  ];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[p.category],
        name: p.name,
        description: p.description,
        price: p.price,
        available: true,
        sortOrder: i,
      },
    });
    console.log(`  Product: ${p.name} — $${p.price} MXN`);
  }

  // ─── Tables ─────────────────────────────────────
  const menuBaseUrl = process.env.MENU_BASE_URL || 'http://localhost:8082';
  for (let i = 1; i <= 8; i++) {
    await prisma.table.create({
      data: {
        tenantId: tenant.id,
        number: i,
        capacity: i <= 4 ? 4 : 6,
        qrCode: `${menuBaseUrl}/la-cocina-de-maria?mesa=${i}`,
      },
    });
    console.log(`  Table: Mesa ${i}`);
  }

  console.log('\nSeed completed!');
  console.log('─────────────────────────────────');
  console.log('Login credentials:');
  console.log('  Superadmin: admin@tonalli.app + Tonalli2026!');
  console.log('  Owner: carlos@tonalli.app + admin + Tonalli2026!');
  console.log('  Staff: carlos@tonalli.app + [username] + demo1234');
  console.log('  Usernames: ana, pedro, maria, jose');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
