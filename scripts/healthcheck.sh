#!/bin/bash
# Tonalli — Health Check Script
# Add to crontab: */5 * * * * /opt/tonalli/scripts/healthcheck.sh

set -uo pipefail

API_URL="http://localhost:3000/health"
LOG_FILE="/var/log/tonalli-health.log"
COMPOSE_FILE="/opt/tonalli/docker-compose.yml"

check_container() {
  local name=$1
  local container=$2
  if docker inspect --format='{{.State.Running}}' "$container" 2>/dev/null | grep -q "true"; then
    return 0
  else
    echo "[$(date)] $name: DOWN — restarting..." >> "$LOG_FILE"
    docker compose -f "$COMPOSE_FILE" restart "$container"
    return 1
  fi
}

# Check API health endpoint (timeout 5s)
if curl -sf --max-time 5 "$API_URL" > /dev/null 2>&1; then
  echo "[$(date)] API: OK" >> "$LOG_FILE"
else
  echo "[$(date)] API: NOT RESPONDING — restarting container..." >> "$LOG_FILE"
  docker compose -f "$COMPOSE_FILE" restart api
  sleep 10
  # Verify it came back
  if curl -sf --max-time 5 "$API_URL" > /dev/null 2>&1; then
    echo "[$(date)] API: RECOVERED after restart" >> "$LOG_FILE"
  else
    echo "[$(date)] API: STILL DOWN after restart — manual check needed" >> "$LOG_FILE"
  fi
fi

check_container "PostgreSQL" "tonalli-postgres"
check_container "Redis" "tonalli-redis"
check_container "MinIO" "tonalli-minio"
check_container "Nginx" "tonalli-nginx"

# Trim log file if over 10k lines
if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt 10000 ]; then
  tail -5000 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
fi
