#!/bin/bash
# Tonalli — Deployment Script
# Usage: ./scripts/deploy.sh

set -euo pipefail

APP_DIR="/opt/tonalli"

echo "═══════════════════════════════════"
echo " Tonalli — Deploy"
echo "═══════════════════════════════════"

cd "$APP_DIR"

echo "[1/5] Pulling latest code..."
git pull origin main

echo "[2/5] Building API container..."
docker compose build api

echo "[3/5] Running database migrations..."
docker compose run --rm api npx prisma migrate deploy

echo "[4/5] Restarting API (zero-downtime)..."
docker compose up -d api

echo "[5/5] Cleaning old images..."
docker image prune -f

echo ""
echo "Deploy complete! Checking health..."
sleep 3
curl -sf http://localhost:3000/health && echo " — API OK" || echo " — API FAILED"
