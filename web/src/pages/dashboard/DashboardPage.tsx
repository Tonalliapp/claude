import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  ChefHat,
  ClipboardList,
  Grid3X3,
  UtensilsCrossed,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { apiFetch } from '@/config/api';
import type { DashboardData, Category } from '@/types';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const { isComplete: onboardingComplete } = useOnboarding();

  const canViewDashboard = user?.role === 'owner' || user?.role === 'admin';

  // Check if owner needs onboarding
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<Category[]>('/categories', { auth: true }),
    enabled: canViewDashboard && user?.role === 'owner' && !onboardingComplete,
  });

  if (
    canViewDashboard &&
    user?.role === 'owner' &&
    !onboardingComplete &&
    categories !== undefined &&
    categories.length === 0
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardData>('/reports/dashboard', { auth: true }),
    refetchInterval: 30000,
    enabled: canViewDashboard,
  });

  if (!canViewDashboard) {
    return <Navigate to="/dashboard/orders" replace />;
  }

  const fmt = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <h2 className="text-white text-xl font-light mb-6">
        Hola, {user?.name?.split(' ')[0] ?? 'Usuario'}
      </h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-gold animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Sales + Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-5">
              <div className="w-8 h-8 rounded-lg bg-gold-glow flex items-center justify-center mb-2.5">
                <TrendingUp size={16} className="text-gold" />
              </div>
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px] mb-1">VENTAS HOY</p>
              <p className="text-gold text-3xl font-semibold">{fmt(data.todaySales)}</p>
            </div>
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-5">
              <div className="w-7 h-7 rounded-lg bg-jade-glow flex items-center justify-center mb-2">
                <ShoppingBag size={14} className="text-jade" />
              </div>
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px] mb-1">PEDIDOS</p>
              <p className="text-white text-xl font-semibold">{data.todayOrders}</p>
            </div>
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-5">
              <div className="w-7 h-7 rounded-lg bg-status-preparing flex items-center justify-center mb-2">
                <Receipt size={14} className="text-silver" />
              </div>
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px] mb-1">TICKET PROM.</p>
              <p className="text-white text-xl font-semibold">{fmt(data.averageTicket)}</p>
            </div>
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-5">
              <div className="w-7 h-7 rounded-lg bg-gold-glow flex items-center justify-center mb-2">
                <ChefHat size={14} className="text-gold-light" />
              </div>
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px] mb-1">PRODUCTOS</p>
              <p className="text-white text-xl font-semibold">{data.totalProducts}</p>
            </div>
          </div>

          {/* Status row */}
          <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-5 flex mb-6">
            <div className="flex-1 text-center">
              <p className="text-gold text-3xl font-semibold">{data.activeOrders}</p>
              <p className="text-silver-muted text-xs mt-1">Pedidos activos</p>
            </div>
            <div className="w-px bg-light-border" />
            <div className="flex-1 text-center">
              <p className="text-jade-light text-3xl font-semibold">{data.occupiedTables}</p>
              <p className="text-silver-muted text-xs mt-1">de {data.totalTables} mesas</p>
            </div>
          </div>

          {/* Quick actions */}
          <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">ACCESOS RÁPIDOS</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/dashboard/orders', icon: ClipboardList, label: 'Pedidos', color: 'text-gold' },
              { to: '/dashboard/tables', icon: Grid3X3, label: 'Mesas', color: 'text-jade' },
              { to: '/dashboard/menu', icon: UtensilsCrossed, label: 'Menú', color: 'text-silver' },
            ].map(a => (
              <Link
                key={a.to}
                to={a.to}
                className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-gold-border transition-colors"
              >
                <a.icon size={20} className={a.color} />
                <span className="text-silver text-xs font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-silver-muted text-sm mb-2">No se pudieron cargar los datos</p>
          <button onClick={() => refetch()} className="text-gold text-sm font-medium">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
