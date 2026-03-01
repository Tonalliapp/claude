#!/bin/bash
# Tonalli — Daily PostgreSQL Backup with Verification
# Add to crontab: 0 3 * * * /opt/tonalli/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="/opt/tonalli/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/tonalli_${TIMESTAMP}.sql.gz"
LOG_FILE="/var/log/tonalli-backup.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..." >> "$LOG_FILE"

# Create backup
docker compose -f /opt/tonalli/docker-compose.yml exec -T postgres \
  pg_dump -U tonalli tonalli | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup saved: $BACKUP_FILE ($FILESIZE)" >> "$LOG_FILE"

# Verify backup is not empty (minimum 1KB)
BYTES=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
if [ "$BYTES" -lt 1024 ]; then
  echo "[$(date)] ERROR: Backup file too small ($BYTES bytes) — possibly corrupted!" >> "$LOG_FILE"
  exit 1
fi

# Verify backup can be decompressed and contains SQL
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo "[$(date)] ERROR: Backup file is corrupted (gzip test failed)!" >> "$LOG_FILE"
  exit 1
fi

# Verify backup contains expected tables
TABLE_COUNT=$(gunzip -c "$BACKUP_FILE" | grep -c "CREATE TABLE" || true)
if [ "$TABLE_COUNT" -lt 5 ]; then
  echo "[$(date)] WARNING: Backup only contains $TABLE_COUNT tables (expected 10+)" >> "$LOG_FILE"
else
  echo "[$(date)] Backup verified: $TABLE_COUNT tables found" >> "$LOG_FILE"
fi

# Remove old backups
DELETED=$(find "$BACKUP_DIR" -name "tonalli_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Cleaned $DELETED backups older than $RETENTION_DAYS days" >> "$LOG_FILE"
fi

echo "[$(date)] Backup complete" >> "$LOG_FILE"
