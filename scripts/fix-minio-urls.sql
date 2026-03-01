-- Fix existing MinIO URLs to use the public proxy
-- Run this after deploying the nginx proxy config

UPDATE products
SET image_url = REPLACE(image_url, 'http://minio:9000/tonalli-assets/', 'https://api.tonalli.app/storage/')
WHERE image_url LIKE 'http://minio:9000%';

UPDATE tenants
SET logo_url = REPLACE(logo_url, 'http://minio:9000/tonalli-assets/', 'https://api.tonalli.app/storage/')
WHERE logo_url LIKE 'http://minio:9000%';
