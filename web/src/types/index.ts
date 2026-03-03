export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string;
  status: string;
  maxUsers: number;
  maxProducts: number;
  maxTables: number;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Table {
  id: string;
  number: number;
  status: 'free' | 'occupied' | 'ordering' | 'bill' | 'reserved';
  capacity: number;
  qrCode: string;
  active?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  categoryId: string;
  trackStock?: boolean;
  sortOrder: number;
  active: boolean;
  category?: { id: string; name: string };
}

export interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    imageUrl?: string | null;
    category?: { id: string; name: string };
  };
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'paid'
  | 'cancelled';

export type OrderType = 'dine_in' | 'takeout' | 'counter' | 'delivery';

export interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  orderType?: OrderType;
  table: { id: string; number: number } | null;
  user?: { id: string; name: string; role: string } | null;
  items: OrderItem[];
  subtotal: number;
  total: number;
  notes?: string | null;
  customerName?: string | null;
  cancelReason?: string | null;
  deliveryAddress?: string | null;
  deliveryPhone?: string | null;
  deliveryMeta?: {
    driverName?: string;
    driverPhone?: string;
    estimatedMinutes?: number;
    yessweraOrderId?: string;
    deliveredAt?: string;
  } | null;
  source?: 'tonalli' | 'yesswera';
  createdAt: string;
  confirmedAt?: string | null;
  completedAt?: string | null;
  paidAt?: string | null;
}

export interface PosOrderInput {
  items: { productId: string; quantity: number; notes?: string }[];
  orderType: 'takeout' | 'counter' | 'delivery';
  customerName?: string;
  notes?: string;
  payImmediately: boolean;
  paymentMethod: 'cash' | 'card' | 'transfer';
  paymentReference?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: 'owner' | 'admin' | 'cashier' | 'waiter' | 'kitchen';
  active?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface DashboardData {
  todaySales: number;
  todayOrders: number;
  averageTicket: number;
  activeOrders: number;
  totalProducts: number;
  totalTables: number;
  occupiedTables: number;
}

export interface SalesReport {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  daily: Array<{
    date: string;
    orders: number;
    total: number;
  }>;
}

export interface InventoryItem {
  id: string;
  productId: string;
  currentStock: number;
  minStock: number;
  unit: string;
  product: { id: string; name: string; available: boolean };
}

export interface CashRegister {
  id: string;
  status: 'open' | 'closed';
  openingAmount: number;
  closingAmount?: number | null;
  expectedAmount?: number | null;
  salesTotal: number;
  transactions: number;
  notes?: string | null;
  openedAt: string;
  closedAt?: string | null;
  user: { id: string; name: string };
}

export interface Payment {
  id: string;
  orderId: string;
  cashRegisterId?: string | null;
  method: 'cash' | 'card' | 'transfer';
  amount: number;
  reference?: string | null;
  createdAt: string;
  order: { id: string; orderNumber: number; tableId?: string };
}

export interface PaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
}

export interface TopProduct {
  product: { id: string; name: string; price: number; imageUrl: string | null };
  totalQuantity: number;
  totalRevenue: number;
}

export interface WaiterSales {
  user?: { id: string; name: string; role: string };
  orders: number;
  total: number;
}

export interface QRData {
  tableNumber: number;
  qrCode: string;
  menuUrl: string;
}

export interface SocketNotification {
  type: 'order_new' | 'bill_requested' | 'waiter_called' | 'order_updated';
  title: string;
  message: string;
  tableNumber?: number;
  orderId?: string;
  timestamp: string;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface CashRegisterSummary {
  register: CashRegister & { payments: Payment[] };
  breakdown: Record<'cash' | 'card' | 'transfer', { count: number; total: number }>;
  bySource: Record<string, { count: number; total: number }>;
  difference: number;
  totalTransactions: number;
  totalSales: number;
}

export interface CashRegisterHistoryItem extends CashRegister {
  _count: { payments: number };
}

export interface CashRegisterHistoryResponse {
  registers: CashRegisterHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CashRegisterCloseResponse extends CashRegister {
  payments: Payment[];
  breakdown: Record<'cash' | 'card' | 'transfer', { count: number; total: number }>;
  bySource: Record<string, { count: number; total: number }>;
  difference: number;
  totalTransactions: number;
  totalSales: number;
}

// ─── Ingredients & Recipes ─────────────────────────

export type IngredientUnit = 'piezas' | 'kg' | 'g' | 'lt' | 'ml';

export interface Ingredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  costPerUnit: number;
  currentStock: number;
  minStock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeItem {
  id: string;
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: IngredientUnit;
  quantity: number;
  unit: IngredientUnit;
  lineCost: number;
}

export interface ProductRecipe {
  productId: string;
  productName: string;
  price: number;
  recipeCost: number;
  margin: number;
  marginPercent: number;
  items: RecipeItem[];
}

export interface ProductCost {
  productId: string;
  productName: string;
  price: number;
  recipeCost: number;
  margin: number;
  marginPercent: number;
  recipeItems: { ingredientName: string; quantity: number; unit: string; lineCost: number }[];
}

export interface ProductCostsReport {
  products: ProductCost[];
  summary: {
    averageMarginPercent: number;
    lowestMarginProduct: string | null;
    highestMarginProduct: string | null;
  };
}

export interface IngredientConsumption {
  ingredientName: string;
  unit: string;
  totalConsumed: number;
  totalPurchased: number;
  currentStock: number;
  costOfConsumption: number;
}

export interface IngredientConsumptionReport {
  ingredients: IngredientConsumption[];
  totalCostOfGoods: number;
}
