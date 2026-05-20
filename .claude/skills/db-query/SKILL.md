---
name: db-query
description: Ejecutar query SQL en la base de datos de produccion de Tonalli
user-invocable: true
disable-model-invocation: false
argument-hint: <query SQL o descripcion de lo que necesitas consultar>
allowed-tools: Bash
---

## Query a la Base de Datos de Produccion

### Instrucciones

1. Si el usuario paso un query SQL directo, ejecutalo.
2. Si paso una descripcion (ej: "cuantos pedidos hay hoy"), genera el SQL apropiado.

### Ejecucion
```bash
ssh root@217.216.94.95 "docker exec -i tonalli-postgres psql -U tonalli -d tonalli -c \"<QUERY>\""
```

### Reglas de Seguridad

**PERMITIDO:**
- SELECT queries (lectura)
- COUNT, SUM, AVG agregaciones
- Queries con LIMIT (maximo 50 filas si no se especifica)
- EXPLAIN ANALYZE para optimizacion

**REQUIERE CONFIRMACION EXPLICITA del usuario:**
- UPDATE, INSERT, DELETE
- ALTER TABLE
- DROP de cualquier tipo
- Queries sin WHERE en tablas grandes

**NUNCA:**
- No mostrar password_hash, api_key, o campos sensitivos
- No ejecutar DROP DATABASE
- No modificar usuarios superadmin

### Contexto de la BD
- Multi-tenant: casi todas las tablas tienen `tenant_id`
- Tablas principales: tenants, users, products, categories, orders, order_items, ingredients, recipe_items, inventory, cash_registers, payments, tables, audit_logs
- Soft delete con `active = false` en products/ingredients
- Decimals llegan como string en Prisma
- Timezone: UTC en DB, mostrar en America/Mexico_City
