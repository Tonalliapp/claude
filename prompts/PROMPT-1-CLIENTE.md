# TONALLI — App del Cliente (Menú Digital + Pedidos por QR)

Crea una app móvil llamada "Tonalli" para clientes de restaurantes. Es una app de menú digital y pedidos por QR. El cliente escanea un código QR en su mesa y accede a esta app para ver el menú y hacer su pedido sin necesidad de mesero.

La app se conecta a un backend real ya desplegado en producción. Toda la información que necesitas para la integración está en este documento. Siéntete libre de mejorar la experiencia del usuario, agregar animaciones, micro-interacciones y detalles visuales que consideres apropiados — lo que se describe aquí es el mínimo funcional, no un límite creativo.

---

## Identidad de Marca

- **Nombre**: TONALLI (significa "energía vital" en náhuatl)
- **Tagline**: "Energía vital en cada mesa"
- **Estética**: Premium, dark mode obligatorio
- **Colores**:
  - Negro `#0A0A0A` — fondo principal
  - Dorado `#C9A84C` — acento primario, precios, CTAs
  - Verde Jade `#4A8C6F` — disponibilidad, estados positivos, confirmaciones
  - Plata `#C0C0C0` — texto secundario
  - Superficies: `#1A1A1A` para cards, `#111111` para bordes sutiles
- **Tipografía display**: Cormorant Garamond (serif) — logo y títulos principales
- **Tipografía UI**: Outfit (sans-serif) — cuerpo, botones, datos
- El logo "TONALLI" siempre en Cormorant Garamond, letter-spacing amplio, dorado

---

## Cómo Llega el Cliente

El cliente escanea un QR físico en su mesa. El QR contiene una URL con este formato:
```
https://menu.tonalli.app/{slug}?mesa={numero}
```
Ejemplo: `https://menu.tonalli.app/la-cocina-de-maria?mesa=7`

La app debe parsear `slug` de la ruta y `mesa` del query param al iniciar. Estos dos datos son necesarios para todas las llamadas a la API.

---

## API Base

```
https://api.tonalli.app/api/v1
```

No requiere autenticación. Todos los endpoints del cliente son públicos.

---

## Pantallas y Flujo

### 1. Splash / Bienvenida

Al abrir la URL, la app obtiene la información del restaurante y la mesa:

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
- Fondo negro con isotipo de sol dorado animado
- Logo "TONALLI" con gradiente dorado-jade
- Tagline con "vital" resaltado en jade
- Nombre del restaurante
- Badge de mesa: "Mesa 7"
- Botón principal: "Ver Menú"

> **Nota para Rork**: Guarda `restaurant.id` (tenantId), `table.id` (tableId) y `table.number` en el estado global — se usan en todo el flujo.

### 2. Menú Principal

**Llamada:**
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
- Header: logo "TONALLI" centrado, nombre del restaurante en plata, badge de mesa en jade
- Categorías como pills horizontales scrolleables (activa: dorado con texto negro; inactiva: `#1A1A1A` con texto plata)
- Cards de producto: imagen, nombre (blanco), descripción (plata oscuro), precio (dorado), estado de disponibilidad
- Botón "Agregar" que se transforma en controles +/- al agregar
- Barra flotante inferior (aparece al agregar primer item): total, cantidad, botón "Ver pedido"

> **Nota para Rork**: `price` viene como string decimal ("89.00"). El campo `available` determina si el producto se puede agregar. Los no disponibles deben verse pero estar deshabilitados. Siéntete libre de agregar animaciones en la barra del carrito, transiciones entre categorías, o cualquier mejora visual.

### 3. Carrito / Resumen del Pedido

**No requiere llamada a API** — se construye con el estado local del carrito.

**Diseño sugerido:**
- Header con "← Menú" y contador de items
- Título "Tu Pedido" (Cormorant Garamond), subtítulo "Mesa 7 · La Cocina de María"
- Lista de items con controles +/-
- Estado vacío con ilustración
- Campo de texto para notas a la cocina (alergias, preferencias, etc.)
- Sección de totales: subtotal y total en dorado
- Botón "Enviar Pedido →" (dorado, ancho completo)

### 4. Confirmar y Enviar Pedido

**Llamada al enviar:**
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

Respuesta (el pedido creado):
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

> **Nota para Rork**: Guarda el `id` del pedido — lo necesitas para el tracking y para consultar el estado. El `orderNumber` es el número bonito para mostrar al usuario.

### 5. Tracking del Pedido (Tiempo Real)

**Consulta del estado (polling como fallback):**
```
GET /client/orders/{orderId}
```
Respuesta:
```json
{
  "id": "uuid",
  "orderNumber": 42,
  "status": "preparing",
  "items": [...],
  "subtotal": "267.00",
  "total": "267.00",
  "tableNumber": 7,
  "createdAt": "...",
  "confirmedAt": "...",
  "completedAt": null
}
```

**WebSocket (tiempo real):**
```javascript
import { io } from "socket.io-client";

const socket = io("wss://api.tonalli.app/client", {
  auth: {
    tenantId: "uuid-del-restaurante",  // de la llamada inicial
    tableId: "uuid-de-la-mesa"         // de la llamada inicial
  }
});

// Escuchar actualizaciones de pedido
socket.on("order:updated", (order) => {
  // order.status cambia: "pending" → "confirmed" → "preparing" → "ready" → "delivered" → "paid"
  // Actualizar la UI del timeline
});

// Escuchar actualizaciones de items individuales
socket.on("order:item:updated", ({ orderId, item }) => {
  // item.status: "pending" | "preparing" | "ready" | "delivered"
  // Puedes mostrar progreso por platillo
});
```

**Estados del pedido y su significado:**
| Status | Significado para el cliente | Color sugerido |
|--------|----------------------------|----------------|
| `pending` | Tu pedido fue recibido | Dorado |
| `confirmed` | El restaurante confirmó tu pedido | Dorado |
| `preparing` | Tu pedido se está preparando | Dorado claro |
| `ready` | ¡Tu pedido está listo! | Jade |
| `delivered` | Entregado en tu mesa | Jade brillante |
| `paid` | Pagado — ¡Gracias! | Jade |
| `cancelled` | Pedido cancelado | Rojo |

**Diseño sugerido:**
- Número de pedido grande: "#042"
- Timeline vertical con los 4-5 estados principales
- Indicador visual del estado actual (animación sutil en el activo)
- Resumen del pedido debajo
- Botones: "Pedir la cuenta" y "Ordenar más"

> **Nota para Rork**: El WebSocket es la forma principal de recibir actualizaciones. Usa polling como fallback cada 15-30 segundos si el WebSocket se desconecta. Siéntete libre de agregar animaciones en las transiciones de estado, confetti cuando el pedido está listo, o cualquier efecto que mejore la experiencia.

### 6. Acciones Adicionales del Cliente

**Pedir la cuenta:**
```
POST /client/orders/request-bill
Content-Type: application/json

{ "slug": "la-cocina-de-maria", "tableNumber": 7 }
```
Respuesta: `{ "message": "Cuenta solicitada. Un mesero se acercará a tu mesa.", "tableNumber": 7 }`

**Llamar al mesero:**
```
POST /client/orders/call-waiter
Content-Type: application/json

{ "slug": "la-cocina-de-maria", "tableNumber": 7, "reason": "Necesito más servilletas" }
```
Respuesta: `{ "message": "Un mesero se acercará a tu mesa.", "tableNumber": 7 }`

> **Nota para Rork**: Estos botones pueden estar en la pantalla de tracking, en un menú flotante, o donde consideres que sea más accesible para el usuario. Considera agregar feedback visual (toast, animación) al presionarlos. El campo `reason` en call-waiter es opcional.

---

## Comportamiento General

- **Mobile-first**: la app se usa exclusivamente en teléfono desde la mesa
- **Sin login**: no hay registro ni autenticación del cliente
- **Persistencia**: si el cliente recarga la página, debería poder ver su pedido activo (guardar orderId en localStorage)
- **Moneda**: usar la moneda de `restaurant.config.currency` (generalmente "MXN")
- **Idioma**: español México
- **Errores de API**: todos vienen en formato `{ "error": { "message": "...", "code": "..." } }` — mostrar el `message` al usuario de forma amigable

---

## Libertad Creativa

Lo descrito arriba es el flujo funcional mínimo. Siéntete libre de:
- Agregar animaciones y transiciones que enriquezcan la experiencia
- Mejorar la disposición visual de los elementos
- Agregar micro-interacciones (haptic feedback, sonidos sutiles)
- Implementar gestos (swipe para navegar entre categorías, pull-to-refresh)
- Agregar un modo de búsqueda de productos
- Mostrar progreso individual por platillo si el WebSocket lo soporta
- Agregar un botón de "Ordenar más" que regrese al menú manteniendo el tracking
- Cualquier detalle que haga la experiencia más premium y fluida
