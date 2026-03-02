export interface SuperAdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'superadmin';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SuperAdminUser;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface AdminDashboard {
  kpis: {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
  };
  recentTenants: TenantListItem[];
  tenantsByPlan: { plan: string; count: number }[];
  monthlyRegistrations: { month: string; count: number }[];
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  maxTables: number;
  maxUsers: number;
  maxProducts: number;
  createdAt: string;
  stats: {
    users: number;
    orders: number;
    products: number;
    tables: number;
  };
}

export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  config: Record<string, unknown>;
  plan: string;
  status: string;
  maxTables: number;
  maxUsers: number;
  maxProducts: number;
  createdAt: string;
  updatedAt: string;
  users: TenantUser[];
  stats: {
    orders: number;
    products: number;
    tables: number;
    categories: number;
    totalRevenue: number;
    ordersByStatus: { status: string; count: number }[];
  };
}

export interface TenantUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface UserListItem {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
  tenant: { id: string; name: string; slug: string } | null;
}

export interface UserDetail extends UserListItem {
  stats: { orders: number };
}

export interface OrderListItem {
  id: string;
  orderNumber: number;
  status: string;
  total: number;
  tableNumber: number;
  itemCount: number;
  tenant: { id: string; name: string; slug: string };
  createdAt: string;
}

export interface SubscriptionOverview {
  totalTenants: number;
  activeSubs: number;
  byPlan: { plan: string; count: number }[];
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string | null; role: string };
}
