import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Award, Users, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '@/config/api';
import type { SalesReport, TopProduct, WaiterSales } from '@/types';

type Period = 'day' | 'week' | 'month';

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('day');

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales-report', period],
    queryFn: () => apiFetch<SalesReport>(`/reports/sales?period=${period}`, { auth: true }),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: () => apiFetch<TopProduct[]>('/reports/top-products?limit=10', { auth: true }).catch(() => []),
  });

  const { data: waiterSales } = useQuery({
    queryKey: ['waiter-sales'],
    queryFn: () => apiFetch<WaiterSales[]>('/reports/by-waiter', { auth: true }).catch(() => []),
  });

  const topList = Array.isArray(topProducts) ? topProducts : [];
  const waiterList = Array.isArray(waiterSales) ? waiterSales : [];
  const chartData = (sales?.daily ?? []).map(d => ({ label: d.date.slice(5), total: d.total }));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <h2 className="text-white text-xl font-light tracking-wide mb-5">Reportes</h2>

      {/* Period */}
      <div className="flex gap-2 mb-5">
        {([['day', 'Hoy'], ['week', 'Semana'], ['month', 'Mes']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setPeriod(k)}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${period === k ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
      ) : sales ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 space-y-1.5">
              <TrendingUp size={16} className="text-gold" />
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px]">VENTAS</p>
              <p className="text-gold text-2xl font-semibold">${sales.totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 space-y-1.5">
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px]">PEDIDOS</p>
              <p className="text-jade text-2xl font-semibold">{sales.totalOrders}</p>
            </div>
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 space-y-1.5">
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px]">TICKET PROM.</p>
              <p className="text-white text-2xl font-semibold">${sales.averageTicket.toFixed(0)}</p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="mb-6">
              <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">VENTAS POR DÍA</p>
              <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="label" tick={{ fill: '#6A6A6A', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8 }}
                      labelStyle={{ color: '#C0C0C0' }}
                      formatter={(v: number) => [`$${v.toFixed(0)}`, 'Ventas']}
                    />
                    <Bar dataKey="total" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Top Products */}
      {topList.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-gold" />
            <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">TOP PRODUCTOS</p>
          </div>
          <div className="space-y-1.5">
            {topList.map((p, i) => (
              <div key={p.product.id} className="flex items-center bg-tonalli-black-card border border-subtle rounded-xl p-3 gap-3">
                <div className="w-7 h-7 rounded-full bg-gold-glow flex items-center justify-center">
                  <span className="text-gold text-[13px] font-bold">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.product.name}</p>
                  <p className="text-silver-dark text-[11px]">{p.totalQuantity} vendidos</p>
                </div>
                <span className="text-gold text-[15px] font-semibold">${p.totalRevenue.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiter Sales */}
      {waiterList.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-jade" />
            <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">VENTAS POR MESERO</p>
          </div>
          <div className="space-y-1.5">
            {waiterList.map((w, i) => (
              <div key={w.user?.id ?? i} className="flex items-center bg-tonalli-black-card border border-subtle rounded-xl p-3 gap-3">
                <div className="w-8 h-8 rounded-full bg-jade-glow flex items-center justify-center">
                  <span className="text-jade text-sm font-semibold">{(w.user?.name ?? '?').charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{w.user?.name ?? 'Desconocido'}</p>
                  <p className="text-silver-dark text-[11px]">{w.orders} pedidos</p>
                </div>
                <span className="text-jade text-[15px] font-semibold">${w.total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
