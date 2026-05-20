---
name: tonalli-dev
description: Activar modo desarrollo Tonalli — contexto completo del stack, convenciones y patrones
disable-model-invocation: false
---

## Contexto de Desarrollo Tonalli

Al activar este skill, Claude opera con conocimiento profundo del proyecto:

### Stack
- **Backend:** Node.js 20 + TypeScript + Express + Prisma + PostgreSQL 16 + Redis 7 + Socket.io + MinIO + Zod
- **Frontend Web:** Vite + React 19 + TailwindCSS + React Router v7 + TanStack Query + Framer Motion + Recharts
- **Frontend Menu:** Misma stack, proyecto separado en `/menu`
- **Infra:** Docker Compose en VPS Contabo (217.216.94.95), Cloudflare proxy, Let's Encrypt SSL

### Patrones del Proyecto

**Backend — Controller pattern:**
```typescript
export async function handler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.action(req.tenantId!, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
```

**Frontend — TanStack Query + apiFetch:**
```typescript
const { data } = useQuery({
  queryKey: ['resource'],
  queryFn: () => apiFetch<Type>('/endpoint', { auth: true }),
});

const mutation = useMutation({
  mutationFn: (data) => apiFetch('/endpoint', { method: 'POST', body: data, auth: true }),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['resource'] }); toast.success('Listo'); },
  onError: (e: Error) => toast.error(e.message),
});
```

**WebSocket — Real-time con Socket.io:**
```typescript
// Backend: emitir a room del tenant
const io = getIO();
io.of('/staff').to(tenantRoom(tenantId)).emit('event:name', payload);

// Frontend: listener en SocketProvider.tsx
socket.on('event:name', (data) => {
  queryClient.invalidateQueries({ queryKey: ['resource'] });
  toast.info('Titulo', { description: 'Mensaje' });
});
```

### Convenciones
- Validacion con Zod en schemas separados (`module.schema.ts`)
- Errores con `AppError(statusCode, message, code)`
- Multi-tenant: `req.tenantId!` en todos los controllers
- Prisma Decimal → `Number()` antes de `.toFixed()`
- UI en espanol, dark theme (tonalli-black, gold, silver, jade)
- Toasts con Sonner, iconos con Lucide React
- Code-splitting con React.lazy en App.tsx
- Deploy manual via scp (no CI/CD)
