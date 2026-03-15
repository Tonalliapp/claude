# Tonalli — SaaS de Gestion para Restaurantes

## Quick Reference

| Recurso | Valor |
|---------|-------|
| VPS | 217.216.94.95 (Contabo, 6 vCPU, 12GB RAM) |
| Web | https://tonalli.app |
| API | https://api.tonalli.app |
| Menu | https://menu.tonalli.app |
| DB | tonalli (user: tonalli) |
| Repo | github.com/Tonalliapp/claude |

## Stack

- **Backend:** Node.js 20 + TypeScript + Express + Prisma + PostgreSQL 16 + Redis 7 + Socket.io + MinIO + Zod
- **Frontend:** Vite + React 19 + TailwindCSS + React Router v7 + TanStack Query + Framer Motion
- **Infra:** Docker Compose + Nginx + Cloudflare proxy + Let's Encrypt SSL

## Comandos Rapidos (Skills)

- `/deploy-web` — Build + deploy dashboard a produccion
- `/deploy-api` — TypeScript check + deploy backend a produccion
- `/deploy-menu` — Build + deploy menu digital
- `/check-vps` — Diagnostico del servidor (quick/full)
- `/db-query` — Ejecutar SQL en produccion

## Convenciones de Codigo

### Backend
- Controller pattern: try/catch con `next(error)`
- Validacion: Zod schemas en `module.schema.ts`
- Errores: `throw new AppError(statusCode, message, code)`
- Multi-tenant: `req.tenantId!` en todos los handlers
- WebSocket: `getIO().of('/staff').to(tenantRoom(tenantId)).emit()`

### Frontend
- TanStack Query para todo data fetching
- `apiFetch<T>(url, { auth: true })` para llamadas API
- Toasts con Sonner (`toast.success/error/warning`)
- Iconos con Lucide React
- UI en espanol, dark theme
- Code-splitting con React.lazy en App.tsx

## Gotchas

- Prisma Decimal → usar `Number()` antes de `.toFixed()`
- Deploy: scp directo a Docker volumes (no docker cp)
- Migraciones: SQL directo via psql (prisma migrate NO funciona)
- MINGW64 no tiene rsync — usar scp
- `app.tonalli.app` redirige a `tonalli.app` — no sirve archivos

## Estructura del Proyecto

```
src/
  modules/         # Cada modulo: controller + service + schema + routes
  middleware/       # authenticate, roleGuard, validator, planLimits, upload
  websocket/        # Socket.io setup + rooms
  utils/            # helpers compartidos
  config/           # database, redis, minio
web/               # Dashboard React (tonalli.app)
menu/              # Menu digital React (menu.tonalli.app)
prisma/            # Schema + migraciones
scripts/           # Utilidades y migraciones SQL
```
