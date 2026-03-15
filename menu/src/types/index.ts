export type TableStatus = 'free' | 'occupied' | 'ordering' | 'bill' | 'reserved';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'paid'
  | 'cancelled';

export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

export interface RestaurantConfig {
  ivaEnabled?: boolean;
  ivaRate?: number;
  [key: string]: unknown;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  config: RestaurantConfig | null;
}

export interface TableInfo {
  id: string;
  number: number;
  status: TableStatus;
  capacity: number;
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  imageUrl: string | null;
  available: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  products: MenuProduct[];
}

export interface MenuData {
  restaurant: Restaurant;
  categories: MenuCategory[];
}

export interface TableData {
  restaurant: Restaurant;
  table: TableInfo;
}

export interface CartItem {
  product: MenuProduct;
  quantity: number;
  notes?: string;
}

export interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  status: OrderItemStatus;
}

export interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  total: number;
  notes?: string | null;
  tableNumber: number;
  createdAt: string;
  confirmedAt?: string | null;
  completedAt?: string | null;
}
