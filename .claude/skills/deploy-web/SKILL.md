---
name: deploy-web
description: Deploy del dashboard web (tonalli.app) al VPS de produccion
user-invocable: true
disable-model-invocation: false
argument-hint: [opcional: "skip-build" para solo subir archivos sin rebuild]
allowed-tools: Bash, Read, Glob
---

## Deploy Web Dashboard a Produccion

Sigue estos pasos en orden estricto:

### 1. Build
Si el argumento NO es "skip-build":
```bash
cd /c/tonalli/web && npm run build
```
Verifica que el build termine con "built in X.XXs" y sin errores.

### 2. Subir archivos
```bash
scp -r /c/tonalli/web/dist/* root@217.216.94.95:/var/lib/docker/volumes/tonalli_web-static/_data/
```

### 3. Verificar
```bash
ssh root@217.216.94.95 "curl -s -o /dev/null -w '%{http_code}' https://tonalli.app"
```
Debe retornar 200.

### 4. Confirmar
Informa al usuario:
- Resultado del build (tamano de bundles principales)
- Status del upload
- HTTP status code de verificacion
- URL: https://tonalli.app

**IMPORTANTE:**
- El directorio destino es `tonalli_web-static` (NO `tonalli_menu-static`)
- NUNCA deployar a `app.tonalli.app` — ese dominio redirige 301 a `tonalli.app`
- Si el build falla, NO subir archivos viejos
