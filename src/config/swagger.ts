const info = {
  title: 'Tonalli API',
  version: '1.0.0',
  description: 'API de gestión integral para restaurantes — Menú digital QR, pedidos en tiempo real, POS, inventario y reportes.',
  contact: { name: 'Tonalli', url: 'https://tonalli.app' },
};

const servers = [
  { url: 'https://api.tonalli.app', description: 'Producción' },
  { url: 'http://localhost:3000', description: 'Desarrollo' },
];

const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT access token. Obtén uno con POST /auth/login',
  },
};

const tags = [
  { name: 'Auth', description: 'Registro, login, tokens y perfil' },
  { name: 'Tenants', description: 'Configuración del restaurante' },
  { name: 'Users', description: 'Gestión de empleados (owner/admin)' },
  { name: 'Categories', description: 'Categorías del menú' },
  { name: 'Products', description: 'Productos del menú' },
  { name: 'Tables', description: 'Mesas y códigos QR' },
  { name: 'Orders', description: 'Pedidos del staff' },
  { name: 'Menu', description: 'Menú digital público (sin auth)' },
  { name: 'Client Orders', description: 'Pedidos del cliente (sin auth)' },
  { name: 'Inventory', description: 'Control de inventario' },
  { name: 'Cash Register', description: 'Caja registradora' },
  { name: 'Payments', description: 'Pagos' },
  { name: 'Reports', description: 'Reportes y analíticas' },
];

// ─── Reusable Schemas ────────────────────────────
const schemas = {
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          code: { type: 'string' },
        },
      },
    },
  },
  // Auth
  LoginInput: {
    type: 'object',
    required: ['email', 'username', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'carlos@tonalli.app' },
      username: { type: 'string', example: 'admin' },
      password: { type: 'string', example: 'Tonalli2026!' },
    },
  },
  RegisterInput: {
    type: 'object',
    required: ['restaurantName', 'ownerName', 'email', 'password'],
    properties: {
      restaurantName: { type: 'string', example: 'La Cocina de María' },
      ownerName: { type: 'string', example: 'María López' },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      phone: { type: 'string' },
      address: { type: 'string' },
    },
  },
  AuthResponse: {
    type: 'object',
    properties: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
      user: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['owner', 'admin', 'cashier', 'waiter', 'kitchen'] },
        },
      },
      tenant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
        },
      },
    },
  },
  UpdateProfileInput: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      currentPassword: { type: 'string' },
      newPassword: { type: 'string', minLength: 8 },
    },
  },
  // Tenants
  UpdateTenantInput: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      config: { type: 'object', additionalProperties: true },
    },
  },
  // Users
  CreateUserInput: {
    type: 'object',
    required: ['name', 'username', 'password', 'role'],
    properties: {
      name: { type: 'string' },
      username: { type: 'string', pattern: '^[a-zA-Z0-9._-]+$' },
      password: { type: 'string', minLength: 8 },
      role: { type: 'string', enum: ['admin', 'cashier', 'waiter', 'kitchen'] },
    },
  },
  UpdateUserInput: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      username: { type: 'string' },
      password: { type: 'string' },
      role: { type: 'string', enum: ['admin', 'cashier', 'waiter', 'kitchen'] },
      active: { type: 'boolean' },
    },
  },
  // Categories
  CreateCategoryInput: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Entradas' },
      description: { type: 'string' },
      sortOrder: { type: 'integer', minimum: 0 },
    },
  },
  ReorderInput: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
    },
  },
  // Products
  CreateProductInput: {
    type: 'object',
    required: ['categoryId', 'name', 'price'],
    properties: {
      categoryId: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Tacos al pastor' },
      description: { type: 'string' },
      price: { type: 'number', minimum: 0.01, example: 85.0 },
      available: { type: 'boolean', default: true },
      trackStock: { type: 'boolean', default: false },
      sortOrder: { type: 'integer' },
    },
  },
  // Tables
  CreateTableInput: {
    type: 'object',
    required: ['number'],
    properties: {
      number: { type: 'integer', minimum: 1, example: 1 },
      capacity: { type: 'integer' },
    },
  },
  TableStatusInput: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['free', 'occupied', 'ordering', 'bill', 'reserved'] },
    },
  },
  // Orders
  CreateOrderInput: {
    type: 'object',
    required: ['tableId', 'items'],
    properties: {
      tableId: { type: 'string', format: 'uuid' },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1 },
            notes: { type: 'string' },
          },
        },
      },
      notes: { type: 'string' },
    },
  },
  OrderStatusInput: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['confirmed', 'preparing', 'ready', 'delivered', 'paid', 'cancelled'] },
    },
  },
  // Client Orders
  CreateClientOrderInput: {
    type: 'object',
    required: ['slug', 'tableNumber', 'items'],
    properties: {
      slug: { type: 'string', example: 'la-cocina-de-maria' },
      tableNumber: { type: 'integer', minimum: 1 },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1 },
            notes: { type: 'string' },
          },
        },
      },
      notes: { type: 'string' },
    },
  },
  // Inventory
  UpdateInventoryInput: {
    type: 'object',
    properties: {
      currentStock: { type: 'number', minimum: 0 },
      minStock: { type: 'number', minimum: 0 },
      unit: { type: 'string', maxLength: 50 },
    },
  },
  InventoryMovementInput: {
    type: 'object',
    required: ['type', 'quantity'],
    properties: {
      type: { type: 'string', enum: ['in', 'out', 'adjustment'] },
      quantity: { type: 'number', minimum: 0.01 },
      reason: { type: 'string' },
    },
  },
  // Cash Register
  OpenCashRegisterInput: {
    type: 'object',
    required: ['openingAmount'],
    properties: {
      openingAmount: { type: 'number', minimum: 0, example: 500 },
      notes: { type: 'string' },
    },
  },
  CloseCashRegisterInput: {
    type: 'object',
    required: ['closingAmount'],
    properties: {
      closingAmount: { type: 'number', minimum: 0 },
      notes: { type: 'string' },
    },
  },
  // Payments
  CreatePaymentInput: {
    type: 'object',
    required: ['orderId', 'method', 'amount'],
    properties: {
      orderId: { type: 'string', format: 'uuid' },
      method: { type: 'string', enum: ['cash', 'card', 'transfer'] },
      amount: { type: 'number', minimum: 0.01 },
      reference: { type: 'string', maxLength: 255 },
    },
  },
};

// ─── Helper ──────────────────────────────────────
const uuid = { type: 'string' as const, format: 'uuid' };
const idParam = { in: 'path', name: 'id', required: true, schema: uuid };
const auth = [{ bearerAuth: [] }];
const json = (ref: string) => ({ content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } } });
const res200 = (desc: string) => ({ 200: { description: desc } });
const res201 = (desc: string) => ({ 201: { description: desc } });
const res401 = { description: 'No autorizado' };
const res404 = { description: 'No encontrado' };
const dateQuery = (name: string, required = false) => ({
  in: 'query', name, required, schema: { type: 'string', format: 'date-time' },
});
const pageQuery = [
  { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
  { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 } },
];

// ─── Paths ───────────────────────────────────────
const paths = {
  // ── Auth ──
  '/api/v1/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Registrar restaurante + owner',
      requestBody: json('RegisterInput'),
      responses: { 201: { description: 'Cuenta creada' }, 409: { description: 'Email ya existe' } },
    },
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Iniciar sesión',
      requestBody: json('LoginInput'),
      responses: { 200: { description: 'Login exitoso' }, 401: { description: 'Credenciales inválidas' } },
    },
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Renovar access token',
      requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
      responses: { 200: { description: 'Tokens renovados' }, 401: { description: 'Refresh token inválido' } },
    },
  },
  '/api/v1/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Cerrar sesión',
      requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
      responses: res200('Sesión cerrada'),
    },
  },
  '/api/v1/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Solicitar reset de contraseña',
      requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
      responses: res200('Email enviado (si existe)'),
    },
  },
  '/api/v1/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Restablecer contraseña con token',
      requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['token', 'password'], properties: { token: { type: 'string' }, password: { type: 'string', minLength: 8 } } } } } },
      responses: { 200: { description: 'Contraseña actualizada' }, 400: { description: 'Token inválido o expirado' } },
    },
  },
  '/api/v1/auth/profile': {
    put: {
      tags: ['Auth'],
      summary: 'Actualizar perfil',
      security: auth,
      requestBody: json('UpdateProfileInput'),
      responses: { ...res200('Perfil actualizado'), 401: res401 },
    },
  },

  // ── Tenants ──
  '/api/v1/tenants/me': {
    get: {
      tags: ['Tenants'],
      summary: 'Obtener datos del restaurante',
      security: auth,
      responses: { ...res200('Datos del tenant'), 401: res401 },
    },
    put: {
      tags: ['Tenants'],
      summary: 'Actualizar datos del restaurante',
      security: auth,
      requestBody: json('UpdateTenantInput'),
      responses: { ...res200('Tenant actualizado'), 401: res401 },
    },
  },
  '/api/v1/tenants/me/logo': {
    post: {
      tags: ['Tenants'],
      summary: 'Subir logo del restaurante',
      security: auth,
      requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { logo: { type: 'string', format: 'binary' } } } } } },
      responses: { ...res200('Logo actualizado'), 401: res401 },
    },
  },

  // ── Users ──
  '/api/v1/users': {
    get: {
      tags: ['Users'],
      summary: 'Listar empleados',
      security: auth,
      responses: { ...res200('Lista de usuarios'), 401: res401 },
    },
    post: {
      tags: ['Users'],
      summary: 'Crear empleado',
      security: auth,
      requestBody: json('CreateUserInput'),
      responses: { ...res201('Usuario creado'), 401: res401, 409: { description: 'Username ya existe' } },
    },
  },
  '/api/v1/users/{id}': {
    put: {
      tags: ['Users'],
      summary: 'Actualizar empleado',
      security: auth,
      parameters: [idParam],
      requestBody: json('UpdateUserInput'),
      responses: { ...res200('Usuario actualizado'), 401: res401, 404: res404 },
    },
    delete: {
      tags: ['Users'],
      summary: 'Desactivar empleado',
      security: auth,
      parameters: [idParam],
      responses: { ...res200('Usuario desactivado'), 401: res401, 404: res404 },
    },
  },

  // ── Categories ──
  '/api/v1/categories': {
    get: {
      tags: ['Categories'],
      summary: 'Listar categorías',
      security: auth,
      responses: { ...res200('Lista de categorías'), 401: res401 },
    },
    post: {
      tags: ['Categories'],
      summary: 'Crear categoría',
      security: auth,
      requestBody: json('CreateCategoryInput'),
      responses: { ...res201('Categoría creada'), 401: res401 },
    },
  },
  '/api/v1/categories/{id}': {
    put: {
      tags: ['Categories'],
      summary: 'Actualizar categoría',
      security: auth,
      parameters: [idParam],
      requestBody: json('CreateCategoryInput'),
      responses: { ...res200('Categoría actualizada'), 401: res401, 404: res404 },
    },
    delete: {
      tags: ['Categories'],
      summary: 'Eliminar categoría',
      security: auth,
      parameters: [idParam],
      responses: { ...res200('Categoría eliminada'), 401: res401, 404: res404 },
    },
  },
  '/api/v1/categories/reorder': {
    put: {
      tags: ['Categories'],
      summary: 'Reordenar categorías',
      security: auth,
      requestBody: json('ReorderInput'),
      responses: { ...res200('Orden actualizado'), 401: res401 },
    },
  },

  // ── Products ──
  '/api/v1/products': {
    get: {
      tags: ['Products'],
      summary: 'Listar productos',
      security: auth,
      responses: { ...res200('Lista de productos'), 401: res401 },
    },
    post: {
      tags: ['Products'],
      summary: 'Crear producto',
      security: auth,
      requestBody: json('CreateProductInput'),
      responses: { ...res201('Producto creado'), 401: res401 },
    },
  },
  '/api/v1/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Obtener producto',
      security: auth,
      parameters: [idParam],
      responses: { ...res200('Producto'), 401: res401, 404: res404 },
    },
    put: {
      tags: ['Products'],
      summary: 'Actualizar producto',
      security: auth,
      parameters: [idParam],
      requestBody: json('CreateProductInput'),
      responses: { ...res200('Producto actualizado'), 401: res401, 404: res404 },
    },
    delete: {
      tags: ['Products'],
      summary: 'Eliminar producto',
      security: auth,
      parameters: [idParam],
      responses: { ...res200('Producto eliminado'), 401: res401, 404: res404 },
    },
  },
  '/api/v1/products/reorder': {
    put: {
      tags: ['Products'],
      summary: 'Reordenar productos',
      security: auth,
      requestBody: json('ReorderInput'),
      responses: { ...res200('Orden actualizado'), 401: res401 },
    },
  },
  '/api/v1/products/{id}/availability': {
    patch: {
      tags: ['Products'],
      summary: 'Cambiar disponibilidad',
      security: auth,
      parameters: [idParam],
      requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['available'], properties: { available: { type: 'boolean' } } } } } },
      responses: { ...res200('Disponibilidad actualizada'), 401: res401 },
    },
  },
  '/api/v1/products/{id}/image': {
    post: {
      tags: ['Products'],
      summary: 'Subir imagen del producto',
      security: auth,
      parameters: [idParam],
      requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } } },
      responses: { ...res200('Imagen subida'), 401: res401 },
    },
  },

  // ── Tables ──
  '/api/v1/tables': {
    get: {
      tags: ['Tables'],
      summary: 'Listar mesas',
      security: auth,
      responses: { ...res200('Lista de mesas'), 401: res401 },
    },
    post: {
      tags: ['Tables'],
      summary: 'Crear mesa',
      security: auth,
      requestBody: json('CreateTableInput'),
      responses: { ...res201('Mesa creada'), 401: res401 },
    },
  },
  '/api/v1/tables/{id}': {
    put: {
      tags: ['Tables'],
      summary: 'Actualizar mesa',
      security: auth,
      parameters: [idParam],
      requestBody: json('CreateTableInput'),
      responses: { ...res200('Mesa actualizada'), 401: res401, 404: res404 },
    },
    delete: {
      tags: ['Tables'],
      summary: 'Eliminar mesa',
      security: auth,
      parameters: [idParam],
      responses: { ...res200('Mesa eliminada'), 401: res401, 404: res404 },
    },
  },
  '/api/v1/tables/{id}/qr': {
    get: {
      tags: ['Tables'],
      summary: 'Obtener datos QR de la mesa',
      security: auth,
      parameters: [idParam],
      responses: { ...res200('Datos QR'), 401: res401 },
    },
  },
  '/api/v1/tables/{id}/qr-image': {
    get: {
      tags: ['Tables'],
      summary: 'Descargar imagen QR (PNG)',
      security: auth,
      parameters: [idParam],
      responses: { 200: { description: 'Imagen PNG', content: { 'image/png': { schema: { type: 'string', format: 'binary' } } } } },
    },
  },
  '/api/v1/tables/{id}/qr-custom': {
    post: {
      tags: ['Tables'],
      summary: 'Generar QR personalizado',
      security: auth,
      parameters: [idParam],
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { qrSize: { type: 'integer', default: 60 }, position: { type: 'string', enum: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'], default: 'center' }, opacity: { type: 'number', default: 0.92 }, canvasSize: { type: 'integer', default: 1024 }, showTableNumber: { type: 'boolean', default: true } } } } } },
      responses: { 200: { description: 'Imagen PNG personalizada' } },
    },
  },
  '/api/v1/tables/{id}/qr-branded': {
    post: {
      tags: ['Tables'],
      summary: 'Generar QR con logo del restaurante',
      security: auth,
      parameters: [idParam],
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { layout: { type: 'string', enum: ['logo-left', 'logo-right'], default: 'logo-left' }, showTableNumber: { type: 'boolean', default: true } } } } } },
      responses: { 200: { description: 'Imagen PNG con branding' } },
    },
  },
  '/api/v1/tables/{id}/status': {
    patch: {
      tags: ['Tables'],
      summary: 'Cambiar status de la mesa',
      security: auth,
      parameters: [idParam],
      requestBody: json('TableStatusInput'),
      responses: { ...res200('Status actualizado'), 401: res401 },
    },
  },

  // ── Orders ──
  '/api/v1/orders': {
    get: {
      tags: ['Orders'],
      summary: 'Listar pedidos',
      security: auth,
      parameters: [
        { in: 'query', name: 'status', schema: { type: 'string' } },
        { in: 'query', name: 'tableId', schema: { type: 'string', format: 'uuid' } },
        dateQuery('from'), dateQuery('to'),
        ...pageQuery,
      ],
      responses: { ...res200('Lista de pedidos'), 401: res401 },
    },
    post: {
      tags: ['Orders'],
      summary: 'Crear pedido',
      security: auth,
      requestBody: json('CreateOrderInput'),
      responses: { ...res201('Pedido creado'), 401: res401 },
    },
  },
  '/api/v1/orders/{id}': {
    get: {
      tags: ['Orders'],
      summary: 'Obtener pedido',
      security: auth,
      parameters: [idParam],
      responses: { ...res200('Pedido'), 401: res401, 404: res404 },
    },
  },
  '/api/v1/orders/{id}/status': {
    patch: {
      tags: ['Orders'],
      summary: 'Cambiar status del pedido',
      security: auth,
      parameters: [idParam],
      requestBody: json('OrderStatusInput'),
      responses: { ...res200('Status actualizado'), 401: res401 },
    },
  },
  '/api/v1/orders/{id}/cancel': {
    post: {
      tags: ['Orders'],
      summary: 'Cancelar pedido',
      security: auth,
      parameters: [idParam],
      requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string', minLength: 1, maxLength: 500 } } } } } },
      responses: { ...res200('Pedido cancelado'), 401: res401 },
    },
  },
  '/api/v1/orders/{id}/items/{itemId}/status': {
    patch: {
      tags: ['Orders'],
      summary: 'Cambiar status de un item',
      security: auth,
      parameters: [
        idParam,
        { in: 'path', name: 'itemId', required: true, schema: uuid },
      ],
      requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['preparing', 'ready', 'delivered'] } } } } } },
      responses: { ...res200('Item status actualizado'), 401: res401 },
    },
  },

  // ── Menu (Public) ──
  '/api/v1/menu/{slug}': {
    get: {
      tags: ['Menu'],
      summary: 'Obtener menú público por slug',
      parameters: [{ in: 'path', name: 'slug', required: true, schema: { type: 'string' }, example: 'la-cocina-de-maria' }],
      responses: { ...res200('Menú completo'), 404: res404 },
    },
  },
  '/api/v1/menu/{slug}/table/{number}': {
    get: {
      tags: ['Menu'],
      summary: 'Obtener info de mesa por número',
      parameters: [
        { in: 'path', name: 'slug', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'number', required: true, schema: { type: 'integer' } },
      ],
      responses: { ...res200('Info de la mesa'), 404: res404 },
    },
  },

  // ── Client Orders (Public) ──
  '/api/v1/client/orders': {
    post: {
      tags: ['Client Orders'],
      summary: 'Crear pedido desde menú digital',
      requestBody: json('CreateClientOrderInput'),
      responses: { ...res201('Pedido creado'), 404: res404 },
    },
  },
  '/api/v1/client/orders/{id}': {
    get: {
      tags: ['Client Orders'],
      summary: 'Consultar estado del pedido',
      parameters: [idParam],
      responses: { ...res200('Estado del pedido'), 404: res404 },
    },
  },
  '/api/v1/client/orders/request-bill': {
    post: {
      tags: ['Client Orders'],
      summary: 'Solicitar la cuenta',
      requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['slug', 'tableNumber'], properties: { slug: { type: 'string' }, tableNumber: { type: 'integer', minimum: 1 } } } } } },
      responses: res200('Cuenta solicitada'),
    },
  },
  '/api/v1/client/orders/call-waiter': {
    post: {
      tags: ['Client Orders'],
      summary: 'Llamar al mesero',
      requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['slug', 'tableNumber'], properties: { slug: { type: 'string' }, tableNumber: { type: 'integer', minimum: 1 }, reason: { type: 'string', maxLength: 200 } } } } } },
      responses: res200('Mesero notificado'),
    },
  },

  // ── Inventory ──
  '/api/v1/inventory': {
    get: {
      tags: ['Inventory'],
      summary: 'Listar inventario',
      security: auth,
      responses: { ...res200('Lista de inventario'), 401: res401 },
    },
  },
  '/api/v1/inventory/alerts': {
    get: {
      tags: ['Inventory'],
      summary: 'Productos con stock bajo',
      security: auth,
      responses: { ...res200('Alertas de inventario'), 401: res401 },
    },
  },
  '/api/v1/inventory/{productId}': {
    put: {
      tags: ['Inventory'],
      summary: 'Actualizar inventario de un producto',
      security: auth,
      parameters: [{ in: 'path', name: 'productId', required: true, schema: uuid }],
      requestBody: json('UpdateInventoryInput'),
      responses: { ...res200('Inventario actualizado'), 401: res401 },
    },
  },
  '/api/v1/inventory/{productId}/movement': {
    post: {
      tags: ['Inventory'],
      summary: 'Registrar movimiento de inventario',
      security: auth,
      parameters: [{ in: 'path', name: 'productId', required: true, schema: uuid }],
      requestBody: json('InventoryMovementInput'),
      responses: { ...res201('Movimiento registrado'), 401: res401 },
    },
  },

  // ── Cash Register ──
  '/api/v1/cash-register/current': {
    get: {
      tags: ['Cash Register'],
      summary: 'Obtener caja actual',
      security: auth,
      responses: { ...res200('Caja actual o null'), 401: res401 },
    },
  },
  '/api/v1/cash-register/open': {
    post: {
      tags: ['Cash Register'],
      summary: 'Abrir caja',
      security: auth,
      requestBody: json('OpenCashRegisterInput'),
      responses: { ...res201('Caja abierta'), 401: res401, 409: { description: 'Ya hay una caja abierta' } },
    },
  },
  '/api/v1/cash-register/close': {
    post: {
      tags: ['Cash Register'],
      summary: 'Cerrar caja',
      security: auth,
      requestBody: json('CloseCashRegisterInput'),
      responses: { ...res200('Caja cerrada con resumen'), 401: res401, 404: { description: 'No hay caja abierta' } },
    },
  },

  // ── Payments ──
  '/api/v1/payments': {
    get: {
      tags: ['Payments'],
      summary: 'Listar pagos',
      security: auth,
      parameters: [
        dateQuery('from'), dateQuery('to'),
        { in: 'query', name: 'method', schema: { type: 'string', enum: ['cash', 'card', 'transfer'] } },
        ...pageQuery,
      ],
      responses: { ...res200('Lista de pagos'), 401: res401 },
    },
    post: {
      tags: ['Payments'],
      summary: 'Registrar pago',
      security: auth,
      requestBody: json('CreatePaymentInput'),
      responses: { ...res201('Pago registrado'), 401: res401 },
    },
  },

  // ── Reports ──
  '/api/v1/reports/sales': {
    get: {
      tags: ['Reports'],
      summary: 'Reporte de ventas',
      security: auth,
      parameters: [dateQuery('from', true), dateQuery('to', true)],
      responses: { ...res200('Datos de ventas'), 401: res401 },
    },
  },
  '/api/v1/reports/top-products': {
    get: {
      tags: ['Reports'],
      summary: 'Productos más vendidos',
      security: auth,
      parameters: [
        dateQuery('from'), dateQuery('to'),
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 10, maximum: 50 } },
      ],
      responses: { ...res200('Top productos'), 401: res401 },
    },
  },
  '/api/v1/reports/by-waiter': {
    get: {
      tags: ['Reports'],
      summary: 'Reporte por mesero',
      security: auth,
      parameters: [dateQuery('from', true), dateQuery('to', true)],
      responses: { ...res200('Ventas por mesero'), 401: res401 },
    },
  },
  '/api/v1/reports/dashboard': {
    get: {
      tags: ['Reports'],
      summary: 'Resumen del dashboard',
      security: auth,
      responses: { ...res200('Métricas del dashboard'), 401: res401 },
    },
  },
};

export const swaggerSpec = {
  openapi: '3.0.3',
  info,
  servers,
  tags,
  paths,
  components: {
    securitySchemes,
    schemas,
  },
};
