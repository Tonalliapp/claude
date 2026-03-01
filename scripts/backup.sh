#!/bin/bash
# Tonalli — Daily PostgreSQL Backup
# Add to crontab: 0 3 * * * /opt/tonalli/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="/opt/tonalli/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/tonalli_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

docker compose -f /opt/tonalli/docker-compose.yml exec -T postgres \
  pg_dump -U tonalli tonalli | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup saved: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Remove old backups
find "$BACKUP_DIR" -name "tonalli_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Cleaned backups older than $RETENTION_DAYS days"
