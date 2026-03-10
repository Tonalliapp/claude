import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Grid3X3,
  ChefHat,
  CreditCard,
  DollarSign,
  Package,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  Bell,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { useSocket } from '@/socket/SocketProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: null },
  { to: '/dashboard/orders', icon: ClipboardList, label: 'Pedidos', roles: null },
  { to: '/dashboard/menu', icon: UtensilsCrossed, label: 'Menú', roles: ['owner', 'admin'] },
  { to: '/dashboard/tables', icon: Grid3X3, label: 'Mesas', roles: null },
  { divider: true },
  { to: '/dashboard/kitchen', icon: ChefHat, label: 'Cocina', roles: ['owner', 'admin', 'kitchen'] },
  { to: '/dashboard/pos', icon: DollarSign, label: 'Caja', roles: ['owner', 'admin', 'cashier'] },
  { to: '/dashboard/inventory', icon: Package, label: 'Inventario', roles: ['owner', 'admin'] },
  { to: '/dashboard/delivery-debts', icon: Receipt, label: 'Deudas', roles: ['owner', 'admin'] },
  { to: '/dashboard/reports', icon: BarChart3, label: 'Reportes', roles: ['owner', 'admin'] },
  { to: '/dashboard/users', icon: Users, label: 'Usuarios', roles: ['owner', 'admin'] },
  { to: '/dashboard/settings', icon: Settings, label: 'Config', roles: ['owner', 'admin'] },
  { to: '/dashboard/billing', icon: CreditCard, label: 'Facturacion', roles: ['owner'] },
] as const;

export default function DashboardLayout() {
  const { user, tenant, logout } = useAuth();
  const { isConnected, unreadCount, notifications, clearNotifications, dismissNotification } = useSocket();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const { permission, requestPermission } = usePushNotifications();

  useEffect(() => {
    if (permission === 'default') {
      // Auto-request after a short delay so user sees the dashboard first
      const timer = setTimeout(() => requestPermission(), 3000);
      return () => clearTimeout(timer);
    }
  }, [permission]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNav = NAV_ITEMS.filter(item => {
    if ('divider' in item) return true;
    if (!item.roles) return true;
    return user && (item.roles as readonly string[]).includes(user.role);
  });

  return (
    <div className="flex h-screen bg-tonalli-black overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-gold-border bg-tonalli-black-rich transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold-border">
          {!collapsed ? (
            <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src="/tonalli-logo.svg" alt="Tonalli" className="w-8 h-8 flex-shrink-0" />
              <div>
                <h1 className="font-display text-gold text-lg tracking-[4px] font-light leading-none">TONALLI</h1>
                <p className="text-silver-muted text-[11px] truncate mt-0.5">{tenant?.name ?? 'Mi Restaurante'}</p>
              </div>
            </Link>
          ) : (
            <Link to="/dashboard" className="hover:opacity-80 transition-opacity mx-auto">
              <img src="/tonalli-logo.svg" alt="Tonalli" className="w-7 h-7" />
            </Link>
          )}
          <button
            onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
            className="text-silver-dark hover:text-silver transition-colors p-1"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} className="lg:hidden" />}
            {!collapsed && <Menu size={18} className="hidden lg:block" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {filteredNav.map((item, i) => {
            if ('divider' in item) {
              return <div key={`d-${i}`} className="my-2 mx-3 h-px bg-light-border" />;
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
                    isActive
                      ? 'bg-status-pending text-gold'
                      : 'text-silver-dark hover:text-silver hover:bg-tonalli-black-soft'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <Icon size={18} />
                {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-gold-border">
          <div className={`flex items-center gap-2 mb-2 px-2 ${collapsed ? 'justify-center' : ''}`}>
            {isConnected ? (
              <Wifi size={12} className="text-jade" />
            ) : (
              <WifiOff size={12} className="text-red-500" />
            )}
            {!collapsed && (
              <span className={`text-[10px] ${isConnected ? 'text-jade' : 'text-red-500'}`}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-silver-dark hover:text-red-500 hover:bg-tonalli-black-soft transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={16} />
            {!collapsed && <span className="text-[13px]">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 lg:px-8 py-3 border-b border-gold-border bg-tonalli-black-rich">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-silver-dark p-1">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) clearNotifications(); }}
                className="relative text-silver-dark hover:text-silver transition-colors p-1"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold text-tonalli-black text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-tonalli-black-card border border-gold-border rounded-xl shadow-2xl z-50">
                  <div className="flex items-center justify-between p-3 border-b border-light-border">
                    <span className="text-white text-sm font-medium">Notificaciones</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clearNotifications(); }}
                        className="text-silver-dark text-[10px] hover:text-silver"
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-silver-muted text-sm text-center">Sin notificaciones</p>
                  ) : (
                    notifications.slice(0, 15).map((n, i) => (
                      <div
                        key={i}
                        className="px-3 py-2.5 border-b border-subtle hover:bg-tonalli-black-soft cursor-pointer"
                        onClick={() => {
                          dismissNotification(i);
                          setShowNotifs(false);
                          if (n.type === 'order_new' || n.type === 'order_updated') navigate('/dashboard/orders');
                          else if (n.type === 'bill_requested') navigate('/dashboard/pos');
                          else if (n.type === 'waiter_called') navigate('/dashboard/tables');
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-gold text-xs font-medium">{n.title}</p>
                            <p className="text-silver text-sm truncate">{n.message}</p>
                          </div>
                          <p className="text-silver-dark text-[10px] shrink-0">
                            {new Date(n.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User */}
            <Link to="/dashboard/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-tonalli-black-soft flex items-center justify-center">
                <span className="text-silver text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-white text-xs font-medium leading-tight">{user?.name}</p>
                <p className="text-gold-muted text-[10px] uppercase tracking-wider">{user?.role}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
