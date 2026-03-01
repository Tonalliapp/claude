#!/bin/bash
# Deploy Tonalli Menu (client app) to VPS
# Run from C:/tonalli/

set -e

echo "=== Building Tonalli Menu ==="
cd menu
npm run build
echo "Build complete: $(du -sh dist/)"

echo ""
echo "=== Uploading to VPS ==="
scp -r dist/* root@217.216.94.95:/opt/tonalli/menu-dist/

echo ""
echo "=== Deploying on VPS ==="
ssh root@217.216.94.95 << 'DEPLOY'
set -e

# Copy build files to Docker volume (mounted read-only in container)
VOLUME_PATH=$(docker volume inspect tonalli_menu-static --format '{{.Mountpoint}}')
rm -rf "$VOLUME_PATH"/*
cp -r /opt/tonalli/menu-dist/* "$VOLUME_PATH/"

# Add CORS origin if not present
ENV_FILE="/opt/tonalli/.env"
if ! grep -q "menu.tonalli.app" "$ENV_FILE" 2>/dev/null; then
  CURRENT=$(grep "^CORS_ORIGINS=" "$ENV_FILE" | cut -d= -f2-)
  NEW="${CURRENT},https://menu.tonalli.app"
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${NEW}|" "$ENV_FILE"
  echo "Updated CORS_ORIGINS — restarting API..."
  cd /opt/tonalli
  docker compose restart api
else
  echo "CORS already configured for menu.tonalli.app"
fi

# Reload nginx config
docker exec tonalli-nginx nginx -s reload

echo ""
echo "=== Deployed! https://menu.tonalli.app ==="
DEPLOY
