#!/bin/bash
# Tonalli — Health Check Script
# Add to crontab: */5 * * * * /opt/tonalli/scripts/healthcheck.sh

set -euo pipefail

API_URL="http://localhost:3000/health"
LOG_FILE="/var/log/tonalli-health.log"

check_service() {
  local name=$1
  local container=$2
  if docker inspect --format='{{.State.Running}}' "$container" 2>/dev/null | grep -q "true"; then
    echo "[$(date)] $name: OK" >> "$LOG_FILE"
    return 0
  else
    echo "[$(date)] $name: DOWN — restarting..." >> "$LOG_FILE"
    docker compose -f /opt/tonalli/docker-compose.yml restart "$container"
    return 1
  fi
}

# Check API endpoint
if curl -sf "$API_URL" > /dev/null 2>&1; then
  echo "[$(date)] API: OK" >> "$LOG_FILE"
else
  echo "[$(date)] API: DOWN" >> "$LOG_FILE"
fi

check_service "PostgreSQL" "tonalli-postgres"
check_service "Redis" "tonalli-redis"
check_service "MinIO" "tonalli-minio"
