import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Users,
  ClipboardList,
  CreditCard,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tenants', icon: Store, label: 'Restaurantes' },
  { to: '/users', icon: Users, label: 'Usuarios' },
  { to: '/orders', icon: ClipboardList, label: 'Pedidos' },
  { to: '/subscriptions', icon: CreditCard, label: 'Suscripciones' },
  { to: '/audit-logs', icon: ScrollText, label: 'Audit Logs' },
  { to: '/settings', icon: Settings, label: 'Config' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-tonalli-black overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-gold-border bg-tonalli-black-rich transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold-border">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <Shield size={24} className="text-gold flex-shrink-0" />
              <div>
                <h1 className="font-display text-gold text-lg tracking-[4px] font-light leading-none">ADMIN</h1>
                <p className="text-silver-muted text-[11px] mt-0.5">Tonalli Platform</p>
              </div>
            </div>
          ) : (
            <Shield size={20} className="text-gold mx-auto" />
          )}
          <button
            onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
            className="text-silver-dark hover:text-silver transition-colors p-1"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} className="lg:hidden" />}
            {!collapsed && <Menu size={18} className="hidden lg:block" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
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

        <div className="px-3 py-3 border-t border-gold-border">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-silver-dark hover:text-red-500 hover:bg-tonalli-black-soft transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={16} />
            {!collapsed && <span className="text-[13px]">Cerrar sesion</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 lg:px-8 py-3 border-b border-gold-border bg-tonalli-black-rich">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-silver-dark p-1">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-tonalli-black-soft flex items-center justify-center">
              <span className="text-gold text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase() ?? 'S'}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-white text-xs font-medium leading-tight">{user?.name}</p>
              <p className="text-gold-muted text-[10px] uppercase tracking-wider">superadmin</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
