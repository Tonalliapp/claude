---
name: check-vps
description: Diagnostico completo del VPS de Tonalli — containers, disco, RAM, DB, SSL, backups
user-invocable: true
disable-model-invocation: false
argument-hint: [opcional: "quick" para solo status basico, "full" para diagnostico completo]
allowed-tools: Bash, Read
---

## Diagnostico del VPS (217.216.94.95)

### Quick check (default si no se especifica "full")

Ejecuta estos comandos en paralelo:
```bash
# Containers
ssh root@217.216.94.95 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Health check
ssh root@217.216.94.95 "curl -s http://localhost:3000/health"

# Disco
ssh root@217.216.94.95 "df -h / | tail -1"

# RAM
ssh root@217.216.94.95 "free -h | head -2"
```

### Full check (si argumento es "full")

Ademas de lo anterior:
```bash
# Logs recientes del API (ultimos errores)
ssh root@217.216.94.95 "docker logs tonalli-api --tail 30 2>&1 | grep -i 'error\|warn\|fatal' | tail -10"

# SSL cert expiry
ssh root@217.216.94.95 "docker exec tonalli-nginx openssl x509 -enddate -noout -in /etc/letsencrypt/live/tonalli.app/fullchain.pem 2>/dev/null || echo 'No cert found'"

# Ultimo backup
ssh root@217.216.94.95 "ls -lht /opt/tonalli/backups/ | head -3"

# Conexiones activas de DB
ssh root@217.216.94.95 "docker exec tonalli-postgres psql -U tonalli -d tonalli -c 'SELECT count(*) as active_connections FROM pg_stat_activity;'"

# WebSocket connections
ssh root@217.216.94.95 "docker exec tonalli-api sh -c 'ss -tnp | grep :3000 | wc -l' 2>/dev/null || echo 'ss not available'"

# Uptime
ssh root@217.216.94.95 "uptime"

# Docker disk usage
ssh root@217.216.94.95 "docker system df"

# Swap usage
ssh root@217.216.94.95 "swapon --show"
```

### Reporte
Presenta los resultados en formato tabla con semaforo:
- OK — todo normal
- WARN — necesita atencion pronto
- CRITICAL — accion inmediata requerida

Umbrales:
- Disco > 80% = WARN, > 90% = CRITICAL
- RAM > 80% = WARN, > 95% = CRITICAL
- Container no running = CRITICAL
- Health != "ok" = WARN
- SSL expira en < 14 dias = WARN, < 7 = CRITICAL
- Sin backups en 48h = WARN
