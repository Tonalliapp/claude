---
name: deploy-api
description: Deploy del backend API (api.tonalli.app) al VPS de produccion
user-invocable: true
disable-model-invocation: false
argument-hint: [opcional: "migrate" para ejecutar SQL de migracion antes del deploy]
allowed-tools: Bash, Read, Glob
---

## Deploy Backend API a Produccion

Sigue estos pasos en orden estricto:

### 0. Pre-check — TypeScript
```bash
cd /c/tonalli && npx tsc --noEmit
```
Si hay errores de TypeScript, DETENER y reportar. NO continuar con el deploy.

### 1. Subir archivos
```bash
scp -r /c/tonalli/src /c/tonalli/prisma /c/tonalli/package.json /c/tonalli/tsconfig.json root@217.216.94.95:/opt/tonalli/
```

### 2. Migracion SQL (solo si argumento es "migrate")
Si hay archivos `scripts/migration-*.sql` pendientes, preguntar cual ejecutar:
```bash
cat scripts/migration-XXX.sql | ssh root@217.216.94.95 "docker exec -i tonalli-postgres psql -U tonalli -d tonalli"
```

### 3. Rebuild container
```bash
ssh root@217.216.94.95 "cd /opt/tonalli && docker compose up -d --build api"
```

### 4. Esperar y verificar health
Espera 15 segundos, luego:
```bash
ssh root@217.216.94.95 "curl -s http://localhost:3000/health"
```
Debe retornar `{"status":"ok"}` o `{"status":"degraded"}`.

### 5. Verificar logs
```bash
ssh root@217.216.94.95 "docker logs tonalli-api --tail 20"
```
Buscar errores criticos. Si hay errores, alertar al usuario.

### 6. Confirmar
Informa:
- TypeScript check: OK/errores
- Upload: OK
- Build: OK/errores
- Health: status
- Ultimos logs relevantes
- URL: https://api.tonalli.app

**IMPORTANTE:**
- NUNCA hacer deploy sin TypeScript check limpio
- La DB es `tonalli` (user: `tonalli`), NO `tonalli_db`
- prisma migrate deploy NO funciona (no esta baselined) — usar SQL directo
- Si el container no arranca, revisar logs ANTES de reintentar
