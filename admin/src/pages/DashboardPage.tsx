import { useQuery } from '@tanstack/react-query';
import { Store, Users, ClipboardList, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiFetch } from '@/config/api';
import type { AdminDashboard } from '@/types';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';

const PLAN_COLORS: Record<string, string> = {
  basic: '#C0C0C0',
  professional: '#C9A84C',
  premium: '#4A8C6F',
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiFetch<AdminDashboard>('/admin/dashboard', { auth: true }),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-white text-xl font-medium">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Restaurantes" value={data.kpis.totalTenants} icon={<Store size={20} />} trend={`${data.kpis.activeTenants} activos`} />
        <KpiCard label="Usuarios" value={data.kpis.totalUsers} icon={<Users size={20} />} />
        <KpiCard label="Pedidos" value={data.kpis.totalOrders.toLocaleString()} icon={<ClipboardList size={20} />} />
        <KpiCard label="Ingresos" value={`$${data.kpis.totalRevenue.toLocaleString()} MXN`} icon={<DollarSign size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
          <h3 className="text-white text-sm font-medium mb-4">Registros Mensuales</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyRegistrations}>
              <XAxis dataKey="month" tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
              <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
          <h3 className="text-white text-sm font-medium mb-4">Restaurantes por Plan</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.tenantsByPlan} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={80} label={({ plan, count }) => `${plan}: ${count}`}>
                {data.tenantsByPlan.map((entry) => (
                  <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? '#6A6A6A'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
        <h3 className="text-white text-sm font-medium mb-4">Restaurantes Recientes</h3>
        <div className="space-y-3">
          {data.recentTenants.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-subtle last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{t.name}</p>
                <p className="text-silver-muted text-xs">{t.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gold-muted text-xs capitalize">{t.plan}</span>
                <StatusBadge status={t.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
