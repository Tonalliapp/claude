# TONALLI — Plataforma Completa para Restaurantes

Crea **dos apps móviles** para la plataforma "Tonalli": una para **clientes** (menú digital + pedidos por QR) y otra para el **restaurante** (dashboard de gestión / POS). Ambas se conectan al mismo backend real ya desplegado en producción.

Este documento contiene toda la información de integración. Lo que se describe es el mínimo funcional — siéntete libre de mejorar la UX, agregar animaciones, micro-interacciones y proponer flujos mejores.

---

## 1. INFORMACIÓN GENERAL (Aplica a ambas apps)

### Identidad de Marca

- **Nombre**: TONALLI (significa "energía vital" en náhuatl — la energía vital que el sol deposita en cada ser)
- **Tagline**: "Energía vital en cada mesa"
- **Estética**: Premium, dark mode obligatorio
- **Concepto visual**: Materiales nobles de la cultura mexica — Obsidiana (negro), Oro (energía solar), Jade (vida sagrada), Plata (precisión tecnológica)

### Referencia Visual del Logo

La estética de ambas apps debe reflejar esta identidad visual:

- **Isotipo**: sol dorado con esfera central luminosa (gradiente `#E2C97E` → `#C9A84C` → `#9A7B2F`), anillos orbitales concéntricos, 12 rayos dorados irradiando, 4 acentos jade en forma de hoja entre los rayos, y 4 diamantes dorados en los puntos cardinales. Un anillo sutil en jade rodea el sol (la vida rodeando la energía)
- **Logotipo**: "TONALLI" en Cormorant Garamond weight 300, letter-spacing `0.25em`, con gradiente multi-color: `linear-gradient(160deg, #D8D8D8 0%, #FFFFFF 20%, #E2C97E 45%, #C9A84C 65%, #5FA882 90%)`
- **Línea divisora**: `linear-gradient(90deg, transparent, #C9A84C, #3E7A60, transparent)`
- **Tagline**: "ENERGÍA **VITAL** EN CADA MESA" — texto en `#8A8A8A`, "VITAL" resaltado en `#5FA882` (jade-light), letter-spacing `0.5em`, uppercase
- **Dominio**: "tonalli.app" en `#A08840` (gold-muted)
- **Fondo**: negro profundo `#0A0A0A` con respiración radial sutil de dorado y jade

### Sistema Completo de Colores

Extraído del Brand Identity Guide oficial de Tonalli:

**Colores primarios — Los 4 materiales nobles:**

| Token | Hex | Nombre | Uso |
|-------|-----|--------|-----|
| `--gold` | `#C9A84C` | Oro Solar | Acento primario: precios, CTAs, métricas, rayos del isotipo |
| `--black` | `#0A0A0A` | Obsidiana | Fondo principal de toda la app |
| `--jade` | `#4A8C6F` | Jade Vital | Acento secundario: disponibilidad, confirmaciones, estados positivos |
| `--silver` | `#C0C0C0` | Plata | Texto secundario principal, datos |

**Familia Oro (energía, calor, fuerza):**

| Token | Hex | Uso |
|-------|-----|-----|
| `--gold` | `#C9A84C` | Acento primario, precios, CTAs |
| `--gold-light` | `#E2C97E` | Highlights, estados activos luminosos, centro del sol |
| `--gold-bright` | `#F0D890` | Destellos, glows sutiles |
| `--gold-dark` | `#9A7B2F` | Bordes de botones, sombras doradas, gradiente del carrito |
| `--gold-muted` | `#A08840` | Labels terciarios, acentos sutiles |

**Familia Obsidiana (profundidad, elegancia):**

| Token | Hex | Uso |
|-------|-----|-----|
| `--black` | `#0A0A0A` | Fondo principal |
| `--black-rich` | `#0E0E0E` | Fondo alternativo sutil |
| `--black-soft` | `#141414` | Secciones alternas, separadores |
| `--black-card` | `#1A1A1A` | Cards, contenedores, superficies elevadas |
| `--black-elevated` | `#222222` | Elementos interactivos hover, modales |

**Familia Jade (vida, frescura, lo sagrado):**

| Token | Hex | Uso |
|-------|-----|-----|
| `--jade` | `#4A8C6F` | Disponibilidad, confirmaciones, estados positivos |
| `--jade-light` | `#5FA882` | Texto de estado positivo, "VITAL" en tagline |
| `--jade-bright` | `#72BF96` | Estados activos destacados, badges de "listo" |
| `--jade-dark` | `#3A6F58` | Fondo de badges jade |
| `--jade-deep` | `#2D5A47` | Cards con fondo jade (variante logo) |
| `--jade-muted` | `#3E7A60` | Bordes, líneas divisorias con jade |

**Familia Plata (precisión, tecnología, claridad):**

| Token | Hex | Uso |
|-------|-----|-----|
| `--silver` | `#C0C0C0` | Texto secundario principal |
| `--silver-light` | `#D8D8D8` | Texto secundario importante |
| `--silver-muted` | `#8A8A8A` | Labels, hints, tagline |
| `--silver-dark` | `#6A6A6A` | Descripciones, texto terciario |
| `--platinum` | `#E8E4DF` | Texto principal sobre fondo oscuro (logo variante) |
| `--white-warm` | `#F8F6F3` | Fondos claros (variante logo en blanco) |

**Colores funcionales:**

| Token | Hex | Uso |
|-------|-----|-----|
| `--red` | `#E53E3E` | Alertas, stock crítico, cancelaciones (app restaurante) |
| `--yellow` | `#ECC94B` | Stock bajo, precaución (app restaurante) |

**Glows y transparencias clave:**
- `--jade-glow`: `rgba(74, 140, 111, 0.15)` — fondo de badges jade
- `--jade-glow-strong`: `rgba(74, 140, 111, 0.25)` — hover/active jade
- Glow dorado: `rgba(201, 168, 76, 0.15)` — sombra de botones dorados
- Bordes de cards: `rgba(255, 255, 255, 0.02)` — ultra sutil
- Bordes dorados sutiles: `rgba(201, 168, 76, 0.08)` — cards premium

### Gradientes del Sistema

| Nombre | CSS | Dónde se usa |
|--------|-----|-------------|
| Botón primario | `linear-gradient(135deg, #C9A84C, #9A7B2F)` + `box-shadow: 0 8px 24px rgba(201,168,76,0.15)` | Carrito flotante, CTAs principales |
| Logotipo hero | `linear-gradient(160deg, #D8D8D8 0%, #FFFFFF 20%, #E2C97E 45%, #C9A84C 65%, #5FA882 90%)` | "TONALLI" en splash/header |
| Línea divisoria | `linear-gradient(90deg, transparent, #C9A84C, #3E7A60, transparent)` | Separadores premium |
| Número de mesa | `linear-gradient(160deg, #C9A84C, #5FA882)` | Badge grande de número en QR |
| Sol del isotipo | `radial-gradient(circle at 40% 35%, #E2C97E, #C9A84C, #9A7B2F)` | Esfera central del sol |
| Footer logo | `linear-gradient(160deg, #D8D8D8, #E2C97E, #C9A84C, #5FA882)` | Logo en pie de página |

### Tipografía

**Display — Cormorant Garamond** (serif)
Pesos disponibles: 300, 400, 500, 600, 700 + italics

| Uso | Weight | Tamaño | Estilo |
|-----|--------|--------|--------|
| Logo "TONALLI" | 300 | clamp(52px, 9vw, 88px) | letter-spacing `0.25em`, gradiente multi-color |
| H1 / Títulos de sección | 400 | clamp(30px, 4.5vw, 44px) | letter-spacing `0.03em`, blanco |
| Títulos de pantalla | 400 | 32px | blanco |
| Subtítulos accent | 500 | 18-19px | italic, jade-light |
| Números de pedido | 400 | 40px | gradiente dorado→jade |

**UI — Outfit** (sans-serif)
Pesos disponibles: 200, 300, 400, 500, 600, 700

| Uso | Weight | Tamaño | Color |
|-----|--------|--------|-------|
| Cuerpo de texto | 300 | 15px | `--silver-dark` |
| Nombres de producto | 500 | 13px | blanco |
| Descripciones | 300 | 11px | `--silver-dark` |
| Precios | 600 | 15-18px | `--gold` |
| Botones | 600 | 13px | depende del botón |
| Labels/Status | 500 | 10-11px | variable, letter-spacing `0.05em` |
| Micro-labels | 400-500 | 9-10px | uppercase, letter-spacing `0.1-0.3em` |
| Section labels | 500 | 10px | `--gold`, uppercase, letter-spacing `0.5em` |

### Uso del Color por Contexto

**Textos:**
- Texto principal → `#FFFFFF` (blanco puro)
- Texto secundario/labels → `--silver` `#C0C0C0` o `--silver-muted` `#8A8A8A`
- Descripciones/texto terciario → `--silver-dark` `#6A6A6A`
- Precios y montos → `--gold` `#C9A84C`, weight 600

**Botones y CTAs:**
- Botón primario (carrito, enviar pedido) → gradiente dorado con sombra dorada
- Texto del botón primario → `--black` `#0A0A0A`
- Badge contador en carrito → fondo `--black`, texto `--gold`, circular

**Cards y contenedores:**
- Fondo → `--black-card` `#1A1A1A`
- Borde → `rgba(255, 255, 255, 0.02)` (ultra sutil)
- Hover → borde cambia a `rgba(74, 140, 111, 0.1)` (sutil jade)

**Categorías (pills):**
- Activa → fondo `--gold`, texto `--black`
- Inactiva → fondo `--black-card`, texto `--silver-dark`, borde `rgba(255, 255, 255, 0.04)`

**Badges de estado:**
- Nuevo/Pendiente → fondo `rgba(201, 168, 76, 0.12)`, texto `--gold`
- Preparando → fondo `rgba(192, 192, 192, 0.1)`, texto `--silver`
- Listo → fondo `rgba(74, 140, 111, 0.15)`, texto `--jade-bright` `#72BF96`

**Bordes laterales de pedido (border-left 3px):**
- Nuevo → `--gold`
- Preparando → `--silver`
- Listo → `--jade`

**Badge de mesa:**
- Borde `rgba(74, 140, 111, 0.25)`, texto `--jade-light`, fondo `rgba(74, 140, 111, 0.06)`

**Headers:**
- Borde inferior → `rgba(201, 168, 76, 0.08)` con línea jade centrada debajo

**App restaurante:** el jade se usa más prominentemente (estados, confirmaciones, badges, contadores)

---

### API Base

```
https://api.tonalli.app/api/v1
```

### Manejo de Errores (ambas apps)

Todos los errores vienen en formato:
```json
{ "error": { "message": "Mensaje legible", "code": "ERROR_CODE" } }
```
Mostrar `message` al usuario de forma amigable.

Códigos comunes:
- `INVALID_CREDENTIALS` — email o contraseña incorrectos
- `TENANT_INACTIVE` — restaurante suspendido
- `PLAN_LIMIT` — se alcanzó el límite del plan
- `EMAIL_EXISTS` — email ya registrado
- `TABLE_EXISTS` — número de mesa duplicado
- `PRODUCT_UNAVAILABLE` — producto no disponible
- `INVALID_TRANSITION` — transición de estado no válida
- `VALIDATION_ERROR` — datos inválidos (incluye `details`)

### Estados del Pedido (ambas apps los usan)

| Status | Significado | Color sugerido |
|--------|------------|----------------|
| `pending` | Pedido recibido | `--gold` |
| `confirmed` | Restaurante lo confirmó | `--gold` |
| `preparing` | En preparación | `--gold-light` |
| `ready` | Listo para entregar | `--jade` |
| `delivered` | Entregado en mesa | `--jade-bright` |
| `paid` | Pagado | `--jade` |
| `cancelled` | Cancelado | `--red` |

Transiciones válidas: `pending → confirmed → preparing → ready → delivered → paid`
También: cualquier estado → `cancelled` (excepto `paid` o `cancelled`)

### Comportamiento General

- **Idioma**: español México
- **Moneda**: usar `restaurant.config.currency` (generalmente "MXN")
- Precios vienen como string decimal del API (ej: `"89.00"`), se envían como número

---

## 2. APP DEL CLIENTE (Menú Digital + Pedidos por QR)

### Contexto
App mobile-first que el cliente usa desde su teléfono en la mesa del restaurante. **No requiere login ni registro**. El cliente escanea un QR físico en su mesa y accede al menú para hacer su pedido.

Todos los endpoints del cliente son **públicos** — no requieren autenticación.

### Cómo Llega el Cliente

El QR contiene una URL:
```
https://menu.tonalli.app/{slug}?mesa={numero}
```
Ejemplo: `https://menu.tonalli.app/la-cocina-de-maria?mesa=7`

La app debe parsear `slug` de la ruta y `mesa` del query param al iniciar.

### Pantallas y Flujo del Cliente

#### 2.1 Splash / Bienvenida

**Llamada inicial:**
```
GET /menu/{slug}/table/{numero}
```
Respuesta:
```json
{
  "restaurant": {
    "id": "uuid",
    "name": "La Cocina de María",
    "slug": "la-cocina-de-maria",
    "logoUrl": "https://...",
    "config": { "address": "...", "currency": "MXN", "timezone": "..." }
  },
  "table": {
    "id": "uuid-de-la-mesa",
    "number": 7,
    "status": "free",
    "capacity": 4
  }
}
```

**Diseño sugerido:**
- Fondo `--black` con isotipo de sol dorado animado (respiración sutil con glow dorado)
- Logo "TONALLI" con gradiente hero multi-color
- Línea divisora dorado→jade
- Tagline con "VITAL" resaltado en `--jade-light`
- Nombre del restaurante en `--silver-muted`
- Badge de mesa: "Mesa 7" con estilo jade (borde jade, texto jade-light, fondo jade-glow)
- Botón principal: "Ver Menú" con gradiente dorado

> **Nota para Rork**: Guarda `restaurant.id` (tenantId), `table.id` (tableId) y `table.number` en el estado global — se usan en todo el flujo.

#### 2.2 Menú Principal

```
GET /menu/{slug}
```
Respuesta:
```json
{
  "restaurant": { "id": "uuid", "name": "...", "slug": "...", "logoUrl": "...", "config": {} },
  "categories": [
    {
      "id": "uuid",
      "name": "Entradas",
      "description": "Para abrir el apetito",
      "products": [
        {
          "id": "uuid",
          "name": "Guacamole con Totopos",
          "description": "Aguacate fresco machacado con chile serrano...",
          "price": "89.00",
          "imageUrl": "https://...",
          "available": true
        }
      ]
    }
  ]
}
```

**Diseño sugerido:**
- Header: logo "TONALLI" en `--gold` centrado, nombre del restaurante en `--silver-muted`, badge de mesa en jade
- Borde inferior del header: `rgba(201,168,76,0.08)` con línea jade centrada debajo
- Categorías como pills horizontales scrolleables (activa: fondo `--gold` texto `--black`; inactiva: fondo `--black-card` texto `--silver-dark`)
- Cards de producto en `--black-card`: imagen con border-radius 12px, nombre en blanco (weight 500), descripción en `--silver-dark` (weight 300), precio en `--gold` (weight 600)
- Disponibilidad: dot `--jade-light` + "Disponible" en 9px
- Botón "Agregar" que se transforma en controles +/- al agregar
- Barra flotante inferior (aparece al agregar primer item): gradiente dorado, badge circular negro con contador dorado, total en negro weight 700, texto "Ver pedido" en negro weight 600

> **Nota para Rork**: `price` viene como string decimal ("89.00"). El campo `available` determina si el producto se puede agregar. Los no disponibles deben verse pero estar deshabilitados (opacidad reducida). Siéntete libre de agregar animaciones en la barra del carrito, transiciones entre categorías, o cualquier mejora visual.

#### 2.3 Carrito / Resumen del Pedido

**No requiere llamada a API** — se construye con el estado local del carrito.

**Diseño sugerido:**
- Header con "← Menú" y contador de items
- Título "Tu Pedido" (Cormorant Garamond, weight 400), subtítulo "Mesa 7 · La Cocina de María" en `--silver-muted`
- Lista de items con controles +/- en cards `--black-card`
- Estado vacío con ilustración
- Campo de texto para notas a la cocina (alergias, preferencias, etc.) con borde `rgba(255,255,255,0.04)`
- Sección de totales: subtotal y total en `--gold`, weight 600
- Botón "Enviar Pedido →" (gradiente dorado, ancho completo, sombra dorada)

#### 2.4 Enviar Pedido

```
POST /client/orders
Content-Type: application/json

{
  "slug": "la-cocina-de-maria",
  "tableNumber": 7,
  "items": [
    { "productId": "uuid-del-producto", "quantity": 2, "notes": "Sin cebolla" },
    { "productId": "uuid-otro", "quantity": 1 }
  ],
  "notes": "Somos 3 personas, una es celíaca"
}
```

Respuesta:
```json
{
  "id": "uuid-del-pedido",
  "orderNumber": 42,
  "status": "pending",
  "items": [...],
  "subtotal": "267.00",
  "total": "267.00",
  "createdAt": "2026-02-28T..."
}
```

> **Nota para Rork**: Guarda el `id` del pedido para tracking. El `orderNumber` es el número bonito para mostrar al usuario. Guarda también en localStorage para persistir si el cliente recarga.

#### 2.5 Tracking del Pedido (Tiempo Real)

**Polling (fallback):**
```
GET /client/orders/{orderId}
```

**WebSocket (principal):**
```javascript
import { io } from "socket.io-client";

const socket = io("wss://api.tonalli.app/client", {
  auth: {
    tenantId: "uuid-del-restaurante",
    tableId: "uuid-de-la-mesa"
  }
});

socket.on("order:updated", (order) => {
  // order.status: "pending" → "confirmed" → "preparing" → "ready" → "delivered" → "paid"
});

socket.on("order:item:updated", ({ orderId, item }) => {
  // item.status: "pending" | "preparing" | "ready" | "delivered"
});
```

**Diseño sugerido:**
- Número de pedido grande: "#042" en Cormorant Garamond con gradiente dorado→jade
- Timeline vertical con los estados principales, indicador animado en el estado actual
- Bordes de estado: dots con colores del sistema (dorado → jade según progreso)
- Resumen del pedido debajo en cards `--black-card`
- Botones: "Pedir la cuenta" y "Ordenar más"

> **Nota para Rork**: El WebSocket es la forma principal de recibir actualizaciones. Usa polling cada 15-30 segundos como fallback si el WebSocket se desconecta. Siéntete libre de agregar confetti/efectos cuando el pedido esté listo, o cualquier detalle que mejore la experiencia.

#### 2.6 Acciones Adicionales del Cliente

**Pedir la cuenta:**
```
POST /client/orders/request-bill
{ "slug": "la-cocina-de-maria", "tableNumber": 7 }
→ { "message": "Cuenta solicitada. Un mesero se acercará a tu mesa.", "tableNumber": 7 }
```

**Llamar al mesero:**
```
POST /client/orders/call-waiter
{ "slug": "la-cocina-de-maria", "tableNumber": 7, "reason": "Necesito más servilletas" }
→ { "message": "Un mesero se acercará a tu mesa.", "tableNumber": 7 }
```

> **Nota para Rork**: Estos botones pueden estar en la pantalla de tracking, en un menú flotante, o donde consideres que sea más accesible. El campo `reason` en call-waiter es opcional. Considera agregar feedback visual (toast con estilo jade, animación) al presionarlos.

### Comportamiento Específico del Cliente

- **Mobile-first**: se usa exclusivamente en teléfono desde la mesa
- **Sin login**: no hay registro ni autenticación del cliente
- **Persistencia**: si el cliente recarga la página, debería ver su pedido activo (guardar orderId en localStorage)

---

## 3. APP DEL RESTAURANTE (Dashboard / POS / Gestión)

### Contexto
App responsive (tablet y teléfono) para la gestión interna del restaurante. El dueño y su staff reciben pedidos en tiempo real, gestionan menú, inventario, cobros y reportes.

### Autenticación JWT

Todas las rutas (excepto register/login) requieren:
```
Authorization: Bearer {accessToken}
```

El token expira en 15 minutos. Renovar automáticamente:
```
POST /auth/refresh
{ "refreshToken": "..." }
→ { "accessToken": "nuevo", "refreshToken": "nuevo" }
```

Si el refresh falla → redirigir a login.

**Roles del sistema** — determinan qué pantallas y acciones ve cada usuario:

| Rol | Acceso |
|-----|--------|
| `owner` | Todo — es el dueño del restaurante |
| `admin` | Todo excepto eliminar restaurante |
| `cashier` | POS, corte de caja, pagos, pedidos |
| `waiter` | Pedidos, mesas, vista de comandas |
| `kitchen` | Solo vista de cocina (comandas) |

### Pantallas y Flujo del Restaurante

#### 3.1 Registro de Restaurante

```
POST /auth/register
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
- Fondo `--black`, logo TONALLI centrado arriba con isotipo del sol
- Campos con fondo `--black-card`, bordes `rgba(255,255,255,0.04)`, focus borde `--gold`
- Campos: nombre del restaurante, nombre del dueño, email, contraseña, teléfono (opcional), dirección (opcional)
- Botón "Crear mi restaurante" con gradiente dorado
- Link "¿Ya tienes cuenta? Inicia sesión" en `--silver-muted`

> **Nota para Rork**: Al registrarse, se crea el restaurante con plan básico (10 mesas, 3 usuarios, 50 productos). El usuario queda logueado directamente. Guarda `accessToken`, `refreshToken`, `user` y `tenant` en almacenamiento persistente.

#### 3.2 Login

```
POST /auth/login
{ "email": "carlos@correo.com", "password": "MiPassword123" }
```
Respuesta: misma estructura que register.

**Otros endpoints de auth:**
```
PUT  /auth/profile          → { "name": "...", "email": "..." } (requiere token)
POST /auth/forgot-password  → { "email": "..." }
POST /auth/reset-password   → { "token": "...", "password": "..." }
POST /auth/logout           → { "refreshToken": "..." }
```

#### 3.3 Dashboard Principal

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
- Header: logo TONALLI en `--gold`, nombre del restaurante, nombre del usuario + badge de rol
- Métricas del día en cards `--black-card`: ventas ($) en `--gold` grande, pedidos activos, ticket promedio, platillos vendidos
- Labels en `--silver-muted`, valores en `--gold` o blanco
- Mesas ocupadas vs total con barra visual
- Accesos rápidos a: Pedidos, Mesas, Menú

> **Nota para Rork**: Dashboard solo visible para `owner` y `admin`. El `cashier` entra directo a POS/Pedidos. El `waiter` a Pedidos/Mesas. El `kitchen` directo a Vista de Cocina. Diseña la mejor experiencia de entrada para cada rol.

#### 3.4 Pedidos / Comandas en Tiempo Real

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

**Cancelar pedido:**
```
POST /orders/{orderId}/cancel
{ "reason": "Cliente se fue" }
```

**Cambiar estado de item individual:**
```
PATCH /orders/{orderId}/items/{itemId}/status
{ "status": "preparing" }
```
Status de items: `pending → preparing → ready → delivered`

**Diseño sugerido:**
- Tabs estilo segmented control: Pendientes, En Preparación, Listos, Todos (activo: fondo `--gold` texto `--black`; inactivo: texto `--silver-dark`)
- Cards de pedido en `--black-card` con border-left 3px (nuevo=`--gold`, preparando=`--silver`, listo=`--jade`)
- Número de mesa prominente, tiempo transcurrido en `--silver-dark`, lista de items, badge de estado, botones de acción
- Notificación sonora + visual cuando llega pedido nuevo o el cliente pide cuenta/mesero
- Badge contador en `--jade` con el número de pedidos activos

#### 3.5 Vista de Cocina

Mismos endpoints de pedidos filtrados:
```
GET /orders?status=confirmed
GET /orders?status=preparing
```

**Diseño sugerido:**
- Pantalla completa optimizada para tablet/pantalla grande
- Solo pedidos pendientes de preparar y en preparación
- Cards grandes con items legibles
- Timer visible por pedido (calculado desde `createdAt`) — cambia de color si pasa mucho tiempo
- Botón grande "LISTO" en `--jade` para marcar como `ready`
- Botón por cada item para marcarlo individualmente
- Interfaz mínima — sin navegación innecesaria

> **Nota para Rork**: El rol `kitchen` solo debe ver esta pantalla. La cocina también puede marcar items individuales con `PATCH /orders/{orderId}/items/{itemId}/status`. Considera diseñar una versión grid para cuando hay muchos pedidos simultáneos.

#### 3.6 Menú / Catálogo

**Categorías:**
```
GET    /categories
POST   /categories      { name, description, sortOrder }
PUT    /categories/{id} { name, description, active }
DELETE /categories/{id}                    → falla si tiene productos
PUT    /categories/reorder { ids: ["uuid1","uuid2",...] }
```

**Productos:**
```
GET    /products                           → filtrar con ?categoryId=uuid
GET    /products/{id}
POST   /products        { categoryId, name, description, price, available, trackStock, sortOrder }
PUT    /products/{id}   { name, price, ... }
DELETE /products/{id}
PUT    /products/reorder { ids: ["uuid1","uuid2",...] }
PATCH  /products/{id}/availability { available: true/false }
POST   /products/{id}/image   (form-data, campo "image")  → subir foto
```

**Diseño sugerido:**
- Lista de categorías con drag-and-drop para reordenar
- CRUD de productos con todos los campos
- Toggle de disponibilidad rápido (`--jade` = disponible, `--red` = no disponible)
- Upload de imagen por producto con preview
- Búsqueda y filtros por categoría

> **Nota para Rork**: El precio se envía como número (ej: 89.50). Las imágenes como form-data (campo `image`), máximo 5MB, formatos JPEG/PNG/WebP/GIF. Libre de agregar preview de imagen, confirmación al eliminar, o animaciones de drag.

#### 3.7 Mesas y QR

**Mesas:**
```
GET    /tables
POST   /tables           { number, capacity }
PUT    /tables/{id}      { number, capacity, active }
DELETE /tables/{id}
PATCH  /tables/{id}/status { status: "free"|"occupied"|"ordering"|"bill" }
```

**QR por mesa:**
```
GET  /tables/{id}/qr       → { tableNumber, qrCode: "data:image/png;base64,...", menuUrl: "https://..." }
GET  /tables/{id}/qr-image → descarga PNG directa
POST /tables/{id}/qr-custom → PNG personalizado con logo del restaurante
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

**Prerequisito**: subir logo primero con `POST /tenants/me/logo` (form-data, campo "logo")

**Diseño sugerido:**
- Vista de grid de mesas con colores por estado:
  - Libre → `--silver-dark` / gris oscuro
  - Ocupada → `--gold`
  - Pidiendo → `--jade` (pulsante si hay pedido nuevo)
  - Cuenta → `--silver`
- Tap en mesa: ver pedido activo, cambiar estado
- Sección de QR: generar, preview, descargar PNG
- Pantalla de personalización del QR: preview en vivo donde el dueño arrastra el QR sobre su logo y ajusta tamaño con slider

> **Nota para Rork**: La personalización del QR es una feature diferenciadora. Idealmente el usuario manipula la posición y tamaño visualmente. El backend genera la imagen final.

#### 3.8 Inventario

```
GET  /inventory                           → lista con stock actual
GET  /inventory/alerts                    → productos con stock bajo
PUT  /inventory/{productId}  { currentStock, minStock, unit }
POST /inventory/{productId}/movement { type: "in"|"out"|"adjustment", quantity, reason }
```

**Diseño sugerido:**
- Lista de productos con stock actual y barra visual de nivel
- Indicadores: `--jade` (ok), `--yellow` (bajo), `--red` (crítico/0)
- Botones rápidos para entrada/salida de stock
- Badge con número de alertas en `--red`
- Historial de movimientos por producto

#### 3.9 Corte de Caja / POS

```
GET  /cash-register/current
POST /cash-register/open  { openingAmount: 500.00 }
POST /cash-register/close { closingAmount: 12500.00, notes: "..." }
```

**Pagos:**
```
GET  /payments?from=2026-02-28&to=2026-02-28
POST /payments { orderId: "uuid", method: "cash"|"card"|"transfer", amount: 267.00, reference: "..." }
```

**Diseño sugerido:**
- Estado de la caja: abierta (badge `--jade`) / cerrada (badge `--silver-dark`) con resumen del turno
- Al cerrar: comparación esperado vs real (diferencia en `--jade` si cuadra, `--red` si no)
- Registro de cobros con selección de método de pago
- Resumen por método de pago

> **Nota para Rork**: `POST /payments` cambia automáticamente el status del pedido a `paid` y libera la mesa si no tiene otros pedidos activos. El campo `reference` es para voucher o referencia de transferencia.

#### 3.10 Reportes

```
GET /reports/sales?period=day|week|month
GET /reports/top-products?limit=10
GET /reports/by-waiter
GET /reports/dashboard
```

Ejemplo de sales:
```json
{
  "period": "day",
  "totalSales": "15420.00",
  "totalOrders": 47,
  "breakdown": [
    { "label": "08:00", "sales": "0.00", "orders": 0 },
    { "label": "09:00", "sales": "450.00", "orders": 2 }
  ]
}
```

**Diseño sugerido:**
- Selector de período con estilo segmented control
- Gráfica de barras/línea para ventas (barras en `--gold`, ejes en `--silver-dark`)
- Top 10 productos más vendidos
- Tabla de ventas por mesero

#### 3.11 Usuarios y Permisos

```
GET    /users
POST   /users    { name, email, password, role }
PUT    /users/{id} { name, email, role, active, password }
DELETE /users/{id}                         → desactiva (no elimina)
```

Roles disponibles para crear: `admin`, `cashier`, `waiter`, `kitchen` (no se puede crear otro `owner`)

**Diseño sugerido:**
- Lista de usuarios con badge de rol, estado activo/inactivo
- Toggle activo/inactivo (`--jade` / `--red`)
- No se puede modificar ni desactivar al owner

#### 3.12 Configuración del Restaurante

```
PUT  /tenants/me  { "name": "...", "config": { "address": "...", "phone": "...", "currency": "MXN" } }
POST /tenants/me/logo  (form-data, campo "logo")
GET  /tenants/me
```

**Diseño sugerido:**
- Datos del restaurante: nombre, dirección, teléfono
- Upload de logo con preview circular
- Zona horaria y moneda
- El logo subido aquí es el que se usa para los QR personalizados

### WebSocket del Restaurante

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

> **Nota para Rork**: Los eventos `table:bill-requested` y `table:waiter-called` deben generar notificaciones prominentes que el staff no pueda ignorar. Considera sonidos diferentes por tipo de notificación. Auto-refresh vía WebSocket, polling como fallback si se desconecta.

### Comportamiento Específico del Restaurante

- **Responsive**: tablet y teléfono
- **Token refresh automático**: renovar antes de expirar, si falla → login
- **Navegación por rol**: revisar `user.role` y mostrar solo pantallas permitidas
- **Offline**: considerar cachear datos críticos (menú, mesas) para funcionamiento parcial sin conexión

---

## 4. CÓMO SE CONECTAN AMBAS APPS

El flujo completo es:

1. **Restaurante** se registra → crea menú (categorías + productos) → crea mesas → genera QR
2. El QR apunta a `https://menu.tonalli.app/{slug}?mesa={numero}` — esta URL abre la **App del Cliente**
3. El **Cliente** escanea el QR → ve el menú → hace pedido → el pedido llega al **Restaurante** vía WebSocket (`order:new`)
4. El **Restaurante** confirma → prepara → entrega → cobra — el **Cliente** ve el progreso en tiempo real vía WebSocket (`order:updated`)
5. El **Cliente** puede pedir la cuenta o llamar al mesero — el **Restaurante** recibe la notificación (`table:bill-requested`, `table:waiter-called`)

**Importante**: el QR nunca cambia aunque se actualice el menú, porque apunta al slug del restaurante, no a productos específicos.

---

## 5. LIBERTAD CREATIVA

Lo descrito en este documento es el esqueleto funcional mínimo. Siéntete libre de:

**En ambas apps:**
- Agregar animaciones y transiciones que enriquezcan la experiencia premium
- Mejorar la disposición visual de los elementos
- Agregar micro-interacciones (haptic feedback, sonidos sutiles)
- Implementar gestos (swipe, pull-to-refresh, long-press)
- Agregar búsqueda global
- Usar los glows y transparencias del sistema de colores para efectos sutiles
- Cualquier detalle que haga la experiencia más premium y fluida

**En la app del cliente:**
- Modo de búsqueda de productos
- Progreso individual por platillo
- Confetti o efectos cuando el pedido está listo
- Botón de "Ordenar más" que regrese al menú manteniendo el tracking
- Animación del isotipo del sol en el splash

**En la app del restaurante:**
- Rediseñar la navegación (tabs, sidebar, bottom nav — lo que funcione mejor)
- Onboarding para restaurantes nuevos (wizard: logo → categorías → productos → mesas → QR)
- Dark/light mode toggle (dark es obligatorio por defecto)
- Skeleton screens, animaciones de carga
- Badges de notificación en tabs con los colores del sistema
- Vista de cocina como pantalla completa dedicada
- Sonidos diferentes por tipo de notificación (pedido nuevo vs cuenta vs mesero)
- Implementar gestos (swipe para cambiar estado de pedido, long-press para opciones)
- Cualquier mejora que haga la app más profesional y usable para un restaurante real
