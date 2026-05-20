---
name: logs
description: Ver logs en tiempo real o recientes de los containers de Tonalli en produccion
user-invocable: true
disable-model-invocation: false
argument-hint: [container: api|nginx|postgres|redis] [lineas: numero, default 50]
allowed-tools: Bash
---

## Ver Logs de Produccion

### Argumentos
- `$0` = container name (api, nginx, postgres, redis). Default: api
- `$1` = numero de lineas. Default: 50

### Mapeo de nombres
- api → tonalli-api
- nginx → tonalli-nginx
- postgres → tonalli-postgres
- redis → tonalli-redis

### Ejecucion
```bash
ssh root@217.216.94.95 "docker logs tonalli-{container} --tail {lineas} 2>&1"
```

### Variantes utiles
Si el usuario pide "errores":
```bash
ssh root@217.216.94.95 "docker logs tonalli-api --tail 200 2>&1 | grep -i 'error\|ERR\|fatal\|WARN' | tail -30"
```

Si pide "en vivo" o "follow":
Avisar que no es posible desde aqui — sugerir SSH directo:
```
ssh root@217.216.94.95 "docker logs -f tonalli-api"
```
