-- Yesswera ↔ Tonalli Integration Migration
-- Run against Yesswera's Supabase database

-- Link businesses to their Tonalli restaurant
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tonalli_slug VARCHAR(100);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tonalli_linked BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tonalli_api_key VARCHAR(255);

-- Map Yesswera products to Tonalli product IDs
ALTER TABLE products ADD COLUMN IF NOT EXISTS tonalli_product_id UUID;

-- Track Tonalli order references
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tonalli_order_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tonalli_order_number INTEGER;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_businesses_tonalli_slug ON businesses (tonalli_slug) WHERE tonalli_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_tonalli_product_id ON products (tonalli_product_id) WHERE tonalli_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tonalli_order_id ON orders (tonalli_order_id) WHERE tonalli_order_id IS NOT NULL;
