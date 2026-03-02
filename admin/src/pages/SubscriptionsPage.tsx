import { useQuery } from '@tanstack/react-query';
import { CreditCard, Store, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { apiFetch } from '@/config/api';
import type { SubscriptionOverview } from '@/types';
import KpiCard from '@/components/KpiCard';

const PLAN_COLORS: Record<string, string> = {
  basic: '#C0C0C0',
  professional: '#C9A84C',
  premium: '#4A8C6F',
};

export default function SubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => apiFetch<SubscriptionOverview>('/admin/subscriptions', { auth: true }),
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
      <h1 className="text-white text-xl font-medium">Suscripciones</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total Restaurantes" value={data.totalTenants} icon={<Store size={20} />} />
        <KpiCard label="Suscripciones Stripe" value={data.activeSubs} icon={<CreditCard size={20} />} />
        <KpiCard label="Planes" value={data.byPlan.length} icon={<Users size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
          <h3 className="text-white text-sm font-medium mb-4">Distribucion por Plan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.byPlan} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={100} label={({ plan, count }) => `${plan}: ${count}`}>
                {data.byPlan.map(entry => (
                  <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? '#6A6A6A'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
          <h3 className="text-white text-sm font-medium mb-4">Detalle por Plan</h3>
          <div className="space-y-4">
            {data.byPlan.map(p => (
              <div key={p.plan} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS[p.plan] ?? '#6A6A6A' }} />
                  <span className="text-white text-sm capitalize">{p.plan}</span>
                </div>
                <span className="text-silver text-sm font-medium">{p.count} restaurantes</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
