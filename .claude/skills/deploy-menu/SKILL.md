---
name: deploy-menu
description: Deploy del menu digital (menu.tonalli.app) al VPS de produccion
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read
---

## Deploy Menu Digital a Produccion

### 1. Build
```bash
cd /c/tonalli/menu && npm run build
```

### 2. Subir
```bash
scp -r /c/tonalli/menu/dist/* root@217.216.94.95:/var/lib/docker/volumes/tonalli_menu-static/_data/
```

### 3. Verificar
```bash
ssh root@217.216.94.95 "curl -s -o /dev/null -w '%{http_code}' https://menu.tonalli.app"
```

Informa resultado. URL: https://menu.tonalli.app
