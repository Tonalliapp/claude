#!/bin/bash
# Deploy Tonalli Admin to VPS
# Run from C:/tonalli/

set -e

echo "=== Building Tonalli Admin ==="
cd admin
npm run build
echo "Build complete: $(du -sh dist/)"

echo ""
echo "=== Uploading to VPS ==="
scp -r dist/* root@217.216.94.95:/opt/tonalli/admin-dist/

echo ""
echo "=== Deploying on VPS ==="
ssh root@217.216.94.95 << 'DEPLOY'
set -e

# Copy to Docker volume
CONTAINER=$(docker ps -q -f name=tonalli-nginx)
if [ -z "$CONTAINER" ]; then
  echo "ERROR: nginx container not found"
  exit 1
fi

# Create admin volume directory if needed
docker exec $CONTAINER mkdir -p /var/www/admin

# Copy build files to nginx container
docker cp /opt/tonalli/admin-dist/. $CONTAINER:/var/www/admin/

# Add CORS origin if not present
ENV_FILE="/opt/tonalli/.env"
if ! grep -q "admin.tonalli.app" "$ENV_FILE" 2>/dev/null; then
  CURRENT=$(grep "^CORS_ORIGINS=" "$ENV_FILE" | cut -d= -f2-)
  NEW="${CURRENT},https://admin.tonalli.app"
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${NEW}|" "$ENV_FILE"
  echo "Updated CORS_ORIGINS"
fi

# Reload nginx config
docker exec $CONTAINER nginx -t
docker exec $CONTAINER nginx -s reload

echo ""
echo "=== Deployed! https://admin.tonalli.app ==="
DEPLOY
