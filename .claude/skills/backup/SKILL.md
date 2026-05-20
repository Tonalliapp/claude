---
name: backup
description: Crear backup manual de la base de datos de Tonalli en produccion
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash
---

## Backup Manual de Base de Datos

### 1. Crear backup
```bash
ssh root@217.216.94.95 "docker exec tonalli-postgres pg_dump -U tonalli tonalli | gzip > /opt/tonalli/backups/tonalli_manual_$(date +%Y%m%d_%H%M%S).sql.gz"
```

### 2. Verificar
```bash
ssh root@217.216.94.95 "ls -lh /opt/tonalli/backups/ | head -5"
```

### 3. Descargar (solo si el usuario lo pide)
```bash
scp root@217.216.94.95:/opt/tonalli/backups/tonalli_manual_FECHA.sql.gz /c/tonalli/backups/
```

Informa: nombre del archivo, tamano, fecha.
