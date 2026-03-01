# TONALLI — App del Restaurante (Dashboard / POS / Gestión)

Crea una app móvil/tablet llamada "Tonalli" para la gestión interna de restaurantes. Es el panel donde el dueño y su staff reciben pedidos en tiempo real, gestionan el menú, controlan inventario, manejan cobros y ven reportes de ventas.

La app se conecta a un backend real ya desplegado en producción. Toda la información de integración está en este documento. Siéntete libre de mejorar la UX, agregar animaciones, reorganizar pantallas y proponer flujos mejores — lo que se describe aquí es el mínimo funcional, no un límite creativo.

---

## Identidad de Marca

- **Nombre**: TONALLI (significa "energía vital" en náhuatl)
- **Estética**: Premium, dark mode obligatorio
- **Colores**:
  - Negro `#0A0A0A` — fondo principal
  - Dorado `#C9A84C` — acento primario, métricas, CTAs
  - Verde Jade `#4A8C6F` — estados positivos, disponibilidad, confirmaciones
  - Plata `#C0C0C0` — texto secundario, datos
  - Rojo `#E53E3E` — alertas, stock crítico, cancelaciones
  - Amarillo `#ECC94B` — stock bajo, precaución
  - Superficies: `#1A1A1A` para cards, `#111111` para bordes
- **Tipografía display**: Cormorant Garamond (serif) — logo y títulos
- **Tipografía UI**: Outfit (sans-serif) — cuerpo, botones, datos
- El jade se usa más prominentemente aquí que en la app del cliente

---

## API Base y Autenticación

```
https://api.tonalli.app/api/v1
```

**Autenticación JWT**: Todas las rutas (excepto register/login) requieren header:
```
Authorization: Bearer {accessToken}
```

El token expira en 15 minutos. Usar refresh token para renovar automáticamente:
```
POST /auth/refresh
{ "refreshToken": "..." }
→ { "accessToken": "nuevo", "refreshToken": "nuevo" }
```

**Roles del sistema** — determinan qué pantallas y acciones ve cada usuario:
| Rol | Acceso |
|-----|--------|
| `owner` | Todo — es el dueño del restaurante |
| `admin` | Todo excepto eliminar restaurante |
| `cashier` | POS, corte de caja, pagos, pedidos |
| `waiter` | Pedidos, mesas, vista de comandas |
| `kitchen` | Solo vista de cocina (comandas) |

---

## Pantallas y Flujo

### 1. Registro de Restaurante (Nueva cuenta)

```
POST /auth/register
Content-Type: application/json

{
  "restaurantName": "La Cocina de María",
  "ownerName": "Carlos Valenzuela",
  "email": "carlos@correo.com",
  "password": "MiPassword123",
  "phone": "3221234567",
  "address": "Tomatlán, Jalisco, México"
}
```

Respuesta:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "abc123...",
  "user": { "id": "uuid", "name": "Carlos Valenzuela", "email": "carlos@correo.com", "role": "owner" },
  "tenant": { "id": "uuid", "name": "La Cocina de María", "slug": "la-cocina-de-maria" }
}
```

**Diseño sugerido:**
- Fondo negro, logo TONALLI centrado arriba
- Campos: nombre del restaurante, nombre del dueño, email, contraseña, teléfono (opcional), dirección (opcional)
- Botón "Crear mi restaurante" dorado
- Link "¿Ya tienes cuenta? Inicia sesión"
- Validaciones: email válido, contraseña mínimo 8 caracteres

> **Nota para Rork**: Al registrarse, se crea el restaurante automáticamente con plan básico (10 mesas, 3 usuarios, 50 productos). El usuario queda logueado directamente. Guarda `accessToken`, `refreshToken`, `user` y `tenant` en almacenamiento persistente.

### 2. Login

```
POST /auth/login
{ "email": "carlos@correo.com", "password": "MiPassword123" }
```

Respuesta (misma estructura que register):
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "...", "name": "...", "email": "...", "role": "owner" },
  "tenant": { "id": "...", "name": "...", "slug": "..." }
}
```

**Otros endpoints de auth:**
```
PUT /auth/profile          → { "name": "...", "email": "..." } (requiere token)
POST /auth/forgot-password → { "email": "..." }
POST /auth/reset-password  → { "token": "...", "password": "..." }
POST /auth/logout          → { "refreshToken": "..." }
```

### 3. Dashboard Principal

```
GET /reports/dashboard
```
Respuesta:
```json
{
  "today": {
    "sales": "15420.00",
    "orders": 47,
    "averageTicket": "328.09",
    "itemsSold": 142
  },
  "activeOrders": 8,
  "tablesOccupied": 5,
  "totalTables": 10
}
```

**Diseño sugerido:**
- Header: logo, nombre del restaurante, nombre del usuario + rol
- Métricas del día en cards: ventas ($), pedidos activos, ticket promedio, platillos vendidos
- Valores grandes en dorado, labels en plata
- Mesas ocupadas vs total
- Accesos rápidos a: Pedidos, Mesas, Menú
- Gráfica de ventas por hora (opcional, datos de `/reports/sales?period=day`)

> **Nota para Rork**: Este dashboard solo es visible para `owner` y `admin`. El `cashier` al entrar debería ir directo a POS/Pedidos. El `waiter` a Pedidos/Mesas. El `kitchen` directo a la Vista de Cocina. Siéntete libre de diseñar la mejor experiencia de entrada para cada rol.

### 4. Pedidos / Comandas en Tiempo Real

**Listar pedidos:**
```
GET /orders?status=pending&page=1&limit=20
GET /orders?status=preparing
GET /orders?status=ready
```
Respuesta:
```json
{
  "orders": [
    {
      "id": "uuid",
      "orderNumber": 42,
      "status": "pending",
      "table": { "id": "uuid", "number": 7 },
      "user": { "id": "uuid", "name": "Ana García", "role": "waiter" },
      "items": [
        {
          "id": "uuid",
          "product": { "id": "uuid", "name": "Guacamole", "imageUrl": "..." },
          "quantity": 2,
          "unitPrice": "89.00",
          "subtotal": "178.00",
          "notes": "Sin cebolla",
          "status": "pending"
        }
      ],
      "total": "267.00",
      "notes": "Mesa de 3, una persona celíaca",
      "createdAt": "2026-02-28T..."
    }
  ],
  "total": 47,
  "page": 1,
  "limit": 20
}
```

**Cambiar estado del pedido:**
```
PATCH /orders/{orderId}/status
{ "status": "confirmed" }
```

Transiciones válidas: `pending → confirmed → preparing → ready → delivered → paid`
También: cualquier estado → `cancelled` (excepto ya `paid` o `cancelled`)

**Cancelar pedido:**
```
POST /orders/{orderId}/cancel
{ "reason": "Cliente se fue" }
```

**Cambiar estado de un item individual:**
```
PATCH /orders/{orderId}/items/{itemId}/status
{ "status": "preparing" }
```
Status de items: `pending → preparing → ready → delivered`

**WebSocket (tiempo real):**
```javascript
import { io } from "socket.io-client";

const socket = io("wss://api.tonalli.app/staff", {
  auth: { token: accessToken }
});

// Pedido nuevo (de un cliente que escaneó el QR)
socket.on("order:new", (order) => { /* agregar a la lista */ });

// Pedido actualizado (cambio de estado)
socket.on("order:updated", (order) => { /* actualizar en la lista */ });

// Item individual actualizado
socket.on("order:item:updated", ({ orderId, item }) => { /* actualizar item */ });

// Mesa cambió de estado
socket.on("table:updated", (table) => { /* actualizar mapa de mesas */ });

// Cliente pidió la cuenta
socket.on("table:bill-requested", ({ tableNumber, orders }) => {
  // Mostrar notificación: "Mesa 7 pidió la cuenta"
});

// Cliente llamó al mesero
socket.on("table:waiter-called", ({ tableNumber, reason }) => {
  // Mostrar notificación: "Mesa 3: Necesito más servilletas"
});
```

**Diseño sugerido:**
- Tabs: Pendientes, En Preparación, Listos, Todos
- Cards de pedido con: número de mesa prominente, tiempo transcurrido, lista de items, badge de estado, botones de acción
- Border-left con color del estado
- Notificación sonora + visual cuando llega pedido nuevo o el cliente pide cuenta/mesero
- Auto-refresh vía WebSocket

> **Nota para Rork**: Los WebSocket events `table:bill-requested` y `table:waiter-called` son importantes — deben generar notificaciones prominentes que el staff no pueda ignorar. Considera un sonido diferente para pedido nuevo vs petición de cuenta vs llamar mesero. Libre de implementar badges, toast notifications, o un sistema de alertas flotantes.

### 5. Vista de Cocina

Usa los mismos endpoints de pedidos pero filtrado:
```
GET /orders?status=confirmed
GET /orders?status=preparing
```

**Diseño sugerido:**
- Pantalla completa optimizada para tablet/pantalla grande
- Solo pedidos pendientes de preparar y en preparación
- Cards grandes con items legibles
- Timer visible por pedido (calculado desde `createdAt`)
- Botón grande "LISTO" para marcar el pedido como `ready`
- Botón por cada item para marcarlo individualmente como `ready`
- Interfaz mínima — sin navegación innecesaria

> **Nota para Rork**: El rol `kitchen` solo debe ver esta pantalla. La cocina también puede marcar items individuales con `PATCH /orders/{orderId}/items/{itemId}/status`. Considera diseñar una versión adaptada para cuando hay muchos pedidos simultáneos (grid layout).

### 6. Menú / Catálogo

**Categorías:**
```
GET    /categories                         → lista
POST   /categories      { name, description, sortOrder }  → crear
PUT    /categories/{id} { name, description, active }     → editar
DELETE /categories/{id}                    → eliminar (falla si tiene productos)
PUT    /categories/reorder { ids: ["uuid1","uuid2",...] }  → reordenar
```

**Productos:**
```
GET    /products                           → lista (filtrar con ?categoryId=uuid)
GET    /products/{id}                      → detalle
POST   /products        { categoryId, name, description, price, available, trackStock, sortOrder }
PUT    /products/{id}   { name, price, ... }
DELETE /products/{id}
PUT    /products/reorder { ids: ["uuid1","uuid2",...] }    → reordenar
PATCH  /products/{id}/availability { available: true/false } → toggle rápido
POST   /products/{id}/image   (form-data, campo "image")  → subir foto
```

**Diseño sugerido:**
- Lista de categorías con drag-and-drop para reordenar
- CRUD de productos con todos los campos
- Toggle de disponibilidad rápido (jade = disponible, rojo = no disponible)
- Upload de imagen por producto
- Búsqueda y filtros por categoría

> **Nota para Rork**: El precio viene y se envía como número (ej: 89.50). Las imágenes se suben como form-data (campo `image`), máximo 5MB, formatos JPEG/PNG/WebP/GIF. Libre de agregar preview de imagen, confirmación al eliminar, o animaciones de drag.

### 7. Mesas y QR

**Mesas:**
```
GET    /tables                              → lista con status
POST   /tables           { number, capacity }
PUT    /tables/{id}      { number, capacity, active }
DELETE /tables/{id}
PATCH  /tables/{id}/status { status: "free"|"occupied"|"ordering"|"bill" }
```

**QR por mesa:**
```
GET  /tables/{id}/qr       → { tableNumber, qrCode: "data:image/png;base64,...", menuUrl: "https://..." }
GET  /tables/{id}/qr-image → descarga PNG directa
POST /tables/{id}/qr-custom → PNG personalizado con logo
     { "qrSize": 60, "position": "center", "opacity": 0.92, "canvasSize": 1024, "showTableNumber": true }
```

Opciones de `qr-custom`:
- `qrSize`: 40-80 (% del canvas que ocupa el QR — mín 40 para que se escanee, máx 80 para que se vea el logo)
- `position`: `"center"`, `"top-left"`, `"top-right"`, `"bottom-left"`, `"bottom-right"`
- `customX`: 0-100 (posición X en %, overrides position)
- `customY`: 0-100 (posición Y en %, overrides position)
- `opacity`: 0.5-1.0 (transparencia del QR sobre el logo)
- `canvasSize`: 512-2048 px
- `showTableNumber`: label "Mesa X" debajo del QR

**Prerequisito**: el restaurante debe haber subido su logo primero:
```
POST /tenants/me/logo (form-data, campo "logo")
```

**Diseño sugerido:**
- Vista de grid de mesas con colores por estado
  - Libre: gris/oscuro
  - Ocupada: dorado
  - Pidiendo: jade (pulsante si hay pedido nuevo)
  - Cuenta: plata
- Tap en mesa: ver pedido activo, cambiar estado
- Sección de QR: botón para generar, preview del QR, descargar PNG
- Pantalla de personalización del QR: preview en vivo donde el dueño ajusta tamaño y posición del QR sobre su logo

> **Nota para Rork**: La personalización del QR es una feature diferenciadora. Idealmente el usuario arrastra el QR sobre el preview del logo y ajusta el tamaño con un slider. El backend genera la imagen final. Siéntete libre de diseñar esta experiencia de la forma más intuitiva posible.

### 8. Inventario

```
GET  /inventory                           → lista con stock actual
GET  /inventory/alerts                    → productos con stock bajo
PUT  /inventory/{productId}  { currentStock, minStock, unit }
POST /inventory/{productId}/movement { type: "in"|"out"|"adjustment", quantity, reason }
```

**Diseño sugerido:**
- Lista de productos con stock actual y barra visual de nivel
- Indicadores: verde (ok), amarillo (bajo), rojo (crítico/0)
- Botones rápidos para entrada/salida de stock
- Badge con número de alertas de stock bajo
- Historial de movimientos por producto

### 9. Corte de Caja / POS

```
GET  /cash-register/current               → caja actual (o null si no hay abierta)
POST /cash-register/open  { openingAmount: 500.00 }
POST /cash-register/close { closingAmount: 12500.00, notes: "..." }
```

**Pagos:**
```
GET  /payments?from=2026-02-28&to=2026-02-28  → lista de pagos del día
POST /payments { orderId: "uuid", method: "cash"|"card"|"transfer", amount: 267.00, reference: "..." }
```

**Diseño sugerido:**
- Estado de la caja: abierta/cerrada con resumen del turno
- Botón de apertura con monto inicial
- Al cerrar: comparación esperado vs real (diferencia)
- Registro de cobros con selección de método
- Resumen por método de pago

> **Nota para Rork**: `POST /payments` también cambia automáticamente el status del pedido a `paid` y libera la mesa si no tiene otros pedidos activos. El campo `reference` es para número de voucher o referencia de transferencia.

### 10. Reportes

```
GET /reports/sales?period=day             → ventas del día con desglose por hora
GET /reports/sales?period=week
GET /reports/sales?period=month
GET /reports/top-products?limit=10        → top 10 más vendidos
GET /reports/by-waiter                    → ventas agrupadas por mesero
GET /reports/dashboard                    → métricas resumidas
```

Ejemplo respuesta de sales:
```json
{
  "period": "day",
  "totalSales": "15420.00",
  "totalOrders": 47,
  "breakdown": [
    { "label": "08:00", "sales": "0.00", "orders": 0 },
    { "label": "09:00", "sales": "450.00", "orders": 2 },
    ...
  ]
}
```

**Diseño sugerido:**
- Selector de período (día, semana, mes)
- Gráfica de barras/línea para ventas
- Lista de top 10 productos más vendidos
- Tabla de ventas por mesero
- Colores: dorado para barras, jade para positivo, plata para ejes

### 11. Usuarios y Permisos

```
GET    /users                              → lista de usuarios del restaurante
POST   /users    { name, email, password, role }
PUT    /users/{id} { name, email, role, active, password }
DELETE /users/{id}                         → desactiva (no elimina)
```

Roles disponibles para crear: `admin`, `cashier`, `waiter`, `kitchen` (no se puede crear otro `owner`)

**Diseño sugerido:**
- Lista de usuarios con rol, estado activo/inactivo
- Formulario para crear/editar con selección de rol
- Toggle de activo/inactivo
- No se puede modificar ni desactivar al owner

### 12. Configuración del Restaurante

```
PUT  /tenants/me  { "name": "...", "config": { "address": "...", "phone": "...", "currency": "MXN" } }
POST /tenants/me/logo  (form-data, campo "logo")
GET  /tenants/me  → toda la info del restaurante
```

**Diseño sugerido:**
- Datos del restaurante: nombre, dirección, teléfono, horario
- Upload de logo con preview
- Zona horaria y moneda
- El logo subido aquí es el que se usa para los QR personalizados

---

## WebSocket — Resumen de Eventos

Conexión:
```javascript
const socket = io("wss://api.tonalli.app/staff", { auth: { token: accessToken } });
```

| Evento | Payload | Cuándo ocurre |
|--------|---------|---------------|
| `order:new` | Order completo | Cliente o mesero crea pedido |
| `order:updated` | Order completo | Cambio de estado de un pedido |
| `order:item:updated` | `{ orderId, item }` | Item individual cambia de estado |
| `table:updated` | Table completo | Mesa cambia de estado |
| `table:bill-requested` | `{ tableNumber, tableId, orders, timestamp }` | Cliente pide la cuenta |
| `table:waiter-called` | `{ tableNumber, tableId, reason, timestamp }` | Cliente llama al mesero |

---

## Manejo de Errores

Todos los errores vienen en formato:
```json
{ "error": { "message": "Mensaje legible", "code": "ERROR_CODE" } }
```

Códigos comunes:
- `INVALID_CREDENTIALS` — email o contraseña incorrectos
- `TENANT_INACTIVE` — restaurante suspendido
- `PLAN_LIMIT` — se alcanzó el límite del plan (mesas, usuarios, productos)
- `EMAIL_EXISTS` — email ya registrado
- `TABLE_EXISTS` — número de mesa duplicado
- `PRODUCT_UNAVAILABLE` — producto no disponible
- `INVALID_TRANSITION` — transición de estado no válida
- `VALIDATION_ERROR` — datos inválidos (incluye `details` con campos específicos)

---

## Comportamiento General

- **Responsive**: funciona en tablet y teléfono
- **Idioma**: español México
- **Moneda**: MXN (del config del restaurante)
- **Token refresh automático**: cuando el accessToken expire, renovar con refresh token. Si el refresh falla, redirigir a login
- **Navegación por rol**: al iniciar, revisar `user.role` y mostrar solo las pantallas permitidas
- **Offline**: considerar cachear datos críticos (menú, mesas) para funcionamiento parcial sin conexión

---

## Libertad Creativa

Lo descrito arriba es el esqueleto funcional. Siéntete libre de:
- Rediseñar la navegación (tabs, sidebar, bottom nav — lo que funcione mejor)
- Agregar onboarding para restaurantes nuevos (wizard de setup: logo → categorías → productos → mesas → QR)
- Implementar dark/light mode toggle (el dark es obligatorio por defecto)
- Agregar animaciones de carga, skeleton screens, pull-to-refresh
- Implementar búsqueda global entre pedidos, productos, mesas
- Agregar badges de notificación en los tabs de navegación
- Diseñar la vista de cocina como pantalla completa dedicada
- Agregar sonidos diferentes por tipo de notificación (pedido nuevo vs cuenta vs mesero)
- Implementar gestos (swipe para cambiar estado de pedido, long-press para opciones)
- Cualquier mejora que haga la app más profesional y usable para un restaurante real
