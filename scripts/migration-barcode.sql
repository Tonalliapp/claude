-- Add barcode column to products and ingredients
-- Run via: docker exec -i tonalli-postgres psql -U tonalli -d tonalli < migration-barcode.sql

ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_id_barcode_key ON products (tenant_id, barcode) WHERE barcode IS NOT NULL;

ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS ingredients_tenant_id_barcode_key ON ingredients (tenant_id, barcode) WHERE barcode IS NOT NULL;
