import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Award, Users, Loader2, Download, Banknote, CreditCard, ArrowRightLeft, ChevronDown, ChevronUp, HandCoins, BarChart3, PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlob } from '@/config/api';
import type { SalesReport, TopProduct, WaiterSales, ProductCostsReport, IngredientConsumptionReport } from '@/types';

type Period = 'day' | 'week' | 'month' | 'custom';
type ReportTab = 'sales' | 'costs';

interface TipWaiter {
  userId: string;
  name: string;
  totalTips: number;
  count: number;
  byMethod: { method: string; total: number; count: number }[];
}
interface TipsReport {
  waiters: TipWaiter[];
  grandTotal: number;
  totalPaymentsWithTip: number;
}

interface PaymentBreakdown {
  method: string;
  count: number;
  total: number;
}

function getDateRange(period: Period, customFrom?: string, customTo?: string): { from: string; to: string } {
  if (period === 'custom' && customFrom && customTo) {
    return {
      from: new Date(customFrom + 'T00:00:00').toISOString(),
      to: new Date(customTo + 'T23:59:59').toISOString(),
    };
  }

  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let from: Date;

  switch (period) {
    case 'week':
      from = new Date(to);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    case 'month':
      from = new Date(to);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      break;
    default: // day
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      break;
  }

  return { from: from.toISOString(), to: to.toISOString() };
}

const PIE_COLORS: Record<string, string> = { cash: '#4CAF50', card: '#C9A84C', transfer: '#9E9E9E' };
const METHOD_LABELS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
const METHOD_ICONS: Record<string, typeof Banknote> = { cash: Banknote, card: CreditCard, transfer: ArrowRightLeft };

const TOOLTIP_STYLE = { background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, fontSize: 12 };
const LABEL_STYLE = { color: '#C0C0C0' };
const AXIS_TICK = { fill: '#6A6A6A', fontSize: 10 };
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

export default function ReportsPage() {
  const [reportTab, setReportTab] = useState<ReportTab>('sales');
  const [period, setPeriod] = useState<Period>('day');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const dateRange = useMemo(
    () => getDateRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const queryEnabled = period !== 'custom' || (!!customFrom && !!customTo);
  const dateParams = `from=${encodeURIComponent(dateRange.from)}&to=${encodeURIComponent(dateRange.to)}`;

  // ─── Sales queries ───
  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales-report', dateRange.from, dateRange.to],
    queryFn: () => apiFetch<SalesReport>(`/reports/sales?${dateParams}`, { auth: true }),
    enabled: queryEnabled && reportTab === 'sales',
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', dateRange.from, dateRange.to],
    queryFn: () => apiFetch<TopProduct[]>(`/reports/top-products?${dateParams}&limit=10`, { auth: true }).catch(() => []),
    enabled: queryEnabled && reportTab === 'sales',
  });

  const { data: waiterSales } = useQuery({
    queryKey: ['waiter-sales', dateRange.from, dateRange.to],
    queryFn: () => apiFetch<WaiterSales[]>(`/reports/by-waiter?${dateParams}`, { auth: true }).catch(() => []),
    enabled: queryEnabled && reportTab === 'sales',
  });

  const { data: breakdown } = useQuery({
    queryKey: ['payment-breakdown', dateRange.from, dateRange.to],
    queryFn: () => apiFetch<PaymentBreakdown[]>(`/reports/payment-breakdown?${dateParams}`, { auth: true }).catch(() => []),
    enabled: queryEnabled && reportTab === 'sales',
  });

  // ─── Cost queries ───
  const { data: productCosts, isLoading: costsLoading } = useQuery({
    queryKey: ['product-costs'],
    queryFn: () => apiFetch<ProductCostsReport>('/reports/product-costs', { auth: true }),
    enabled: reportTab === 'costs',
  });

  const { data: consumption } = useQuery({
    queryKey: ['ingredient-consumption', dateRange.from, dateRange.to],
    queryFn: () => apiFetch<IngredientConsumptionReport>(`/reports/ingredient-consumption?${dateParams}`, { auth: true }),
    enabled: queryEnabled && reportTab === 'costs',
  });

  // ─── Tips query ───
  const { data: tipsData } = useQuery({
    queryKey: ['tips-report', dateRange.from, dateRange.to],
    queryFn: () => apiFetch<TipsReport>(`/reports/tips?${dateParams}`, { auth: true }).catch(() => null),
    enabled: queryEnabled && reportTab === 'sales',
  });

  const topList = Array.isArray(topProducts) ? topProducts : [];
  const waiterList = Array.isArray(waiterSales) ? waiterSales : [];
  const breakdownList = Array.isArray(breakdown) ? breakdown : [];
  const costProducts = productCosts?.products ?? [];
  const consumptionList = consumption?.ingredients ?? [];

  // ─── Chart data transforms ───
  const salesChartData = useMemo(() =>
    (sales?.daily ?? []).map(d => {
      const date = new Date(d.date + 'T12:00:00');
      return {
        label: period === 'day' ? d.date.slice(5) : DAY_NAMES[date.getDay()] + ' ' + d.date.slice(8),
        total: d.total,
        orders: d.orders,
      };
    }),
    [sales, period],
  );

  const topChartData = useMemo(() =>
    topList.slice(0, 8).map(p => ({
      name: p.product.name.length > 18 ? p.product.name.slice(0, 16) + '..' : p.product.name,
      fullName: p.product.name,
      qty: p.totalQuantity,
      revenue: p.totalRevenue,
    })).reverse(),
    [topList],
  );

  const waiterChartData = useMemo(() =>
    waiterList.map(w => ({
      name: (w.user?.name ?? 'Desconocido').length > 12
        ? (w.user?.name ?? 'Desconocido').slice(0, 10) + '..'
        : (w.user?.name ?? 'Desconocido'),
      fullName: w.user?.name ?? 'Desconocido',
      total: w.total,
      orders: w.orders,
    })).reverse(),
    [waiterList],
  );

  const marginChartData = useMemo(() =>
    costProducts
      .filter(p => p.recipeItems.length > 0)
      .slice(0, 10)
      .map(p => ({
        name: p.productName.length > 15 ? p.productName.slice(0, 13) + '..' : p.productName,
        fullName: p.productName,
        precio: p.price,
        costo: p.recipeCost,
        margen: p.marginPercent,
      })),
    [costProducts],
  );

  const consumptionChartData = useMemo(() =>
    consumptionList
      .filter(c => c.costOfConsumption > 0)
      .sort((a, b) => b.costOfConsumption - a.costOfConsumption)
      .slice(0, 10)
      .map(c => ({
        name: c.ingredientName.length > 15 ? c.ingredientName.slice(0, 13) + '..' : c.ingredientName,
        fullName: c.ingredientName,
        costo: c.costOfConsumption,
        consumido: c.totalConsumed,
        unit: c.unit,
      }))
      .reverse(),
    [consumptionList],
  );

  const handleExportCsv = async () => {
    try {
      const blob = await apiFetchBlob(`/reports/export/sales?${dateParams}`, { auth: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventas-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV descargado');
    } catch (e: any) {
      toast.error(e.message || 'Error al exportar');
    }
  };

  const marginColor = (pct: number) => pct >= 60 ? 'text-jade' : pct >= 30 ? 'text-yellow-400' : 'text-red-400';
  const marginBg = (pct: number) => pct >= 60 ? 'bg-jade/10' : pct >= 30 ? 'bg-yellow-500/10' : 'bg-red-500/10';

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white text-xl font-light tracking-wide">Reportes</h2>
        {reportTab === 'sales' && (
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gold-border text-gold text-xs font-medium hover:bg-gold/10 transition-colors"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        )}
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 mb-4">
        {([['sales', 'Ventas'], ['costs', 'Costos']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setReportTab(k)}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${reportTab === k ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-3">
        {([['day', 'Hoy'], ['week', 'Semana'], ['month', 'Mes'], ['custom', 'Personalizado']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setPeriod(k)}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${period === k ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <label className="text-silver-muted text-[9px] font-medium tracking-[1.5px] block mb-1">DESDE</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full px-3 py-2 bg-tonalli-black-card border border-subtle rounded-xl text-white text-sm focus:outline-none focus:border-gold-border"
            />
          </div>
          <div className="flex-1">
            <label className="text-silver-muted text-[9px] font-medium tracking-[1.5px] block mb-1">HASTA</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full px-3 py-2 bg-tonalli-black-card border border-subtle rounded-xl text-white text-sm focus:outline-none focus:border-gold-border"
            />
          </div>
        </div>
      )}

      {period !== 'custom' && <div className="mb-5" />}

      {/* ═══════════════════════════════════ */}
      {/* SALES TAB                          */}
      {/* ═══════════════════════════════════ */}
      {reportTab === 'sales' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
          ) : sales ? (
            <>
              {/* Summary Cards */}
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

              {/* ── Sales Trend Chart (Area + Bar) ── */}
              {salesChartData.length > 1 && (
                <div className="mb-6">
                  <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">VENTAS POR DIA</p>
                  <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesChartData}>
                        <defs>
                          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#C9A84C" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelStyle={LABEL_STYLE}
                          formatter={(v: number, name: string) => [name === 'total' ? `$${v.toLocaleString()}` : v, name === 'total' ? 'Ventas' : 'Pedidos']}
                        />
                        <Area type="monotone" dataKey="total" stroke="#C9A84C" strokeWidth={2} fill="url(#goldGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Single day - show bar chart */}
              {salesChartData.length === 1 && (
                <div className="mb-6">
                  <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">VENTAS DEL DIA</p>
                  <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesChartData}>
                        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE} formatter={(v: number) => [`$${v.toFixed(0)}`, 'Ventas']} />
                        <Bar dataKey="total" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* ── Payment Breakdown (Pie + List) ── */}
          {breakdownList.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <PieChartIcon size={14} className="text-gold" />
                <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">METODOS DE PAGO</p>
              </div>
              <div className="flex gap-4 items-center bg-tonalli-black-card border border-subtle rounded-2xl p-4">
                <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breakdownList} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={55} innerRadius={30} strokeWidth={0}>
                        {breakdownList.map((entry) => (
                          <Cell key={entry.method} fill={PIE_COLORS[entry.method] ?? '#666'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, METHOD_LABELS[name] ?? name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {breakdownList.map((b) => {
                    const Icon = METHOD_ICONS[b.method] ?? Banknote;
                    const pct = sales?.totalSales ? ((b.total / sales.totalSales) * 100).toFixed(0) : '0';
                    return (
                      <div key={b.method} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[b.method] ?? '#666' }} />
                        <Icon size={14} className="text-silver" />
                        <span className="text-white text-sm flex-1">{METHOD_LABELS[b.method] ?? b.method}</span>
                        <span className="text-silver-dark text-[11px]">{pct}%</span>
                        <span className="text-gold text-sm font-semibold">${b.total.toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Top Products (Horizontal Bar Chart + List) ── */}
          {topList.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Award size={16} className="text-gold" />
                <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">TOP PRODUCTOS</p>
              </div>

              {/* Horizontal bar chart */}
              {topChartData.length > 1 && (
                <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 mb-3" style={{ height: Math.max(180, topChartData.length * 32 + 20) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topChartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                      <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={LABEL_STYLE}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                        formatter={(v: number, name: string) => [name === 'revenue' ? `$${v.toLocaleString()}` : v, name === 'revenue' ? 'Ingresos' : 'Cantidad']}
                      />
                      <Bar dataKey="revenue" fill="#C9A84C" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* List with rank */}
              <div className="space-y-1.5">
                {topList.map((p, i) => {
                  const maxQty = topList[0]?.totalQuantity ?? 1;
                  const barWidth = Math.max(8, (p.totalQuantity / maxQty) * 100);
                  return (
                    <div key={p.product.id} className="flex items-center bg-tonalli-black-card border border-subtle rounded-xl p-3 gap-3">
                      <div className="w-7 h-7 rounded-full bg-gold-glow flex items-center justify-center shrink-0">
                        <span className="text-gold text-[13px] font-bold">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1.5 bg-tonalli-black rounded-full overflow-hidden">
                            <div className="h-full bg-gold/40 rounded-full" style={{ width: `${barWidth}%` }} />
                          </div>
                          <span className="text-silver-dark text-[11px] shrink-0">{p.totalQuantity} uds</span>
                        </div>
                      </div>
                      <span className="text-gold text-[15px] font-semibold shrink-0">${p.totalRevenue.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Waiter Sales (Horizontal Bar Chart + List) ── */}
          {waiterList.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-jade" />
                <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">VENTAS POR MESERO</p>
              </div>

              {/* Horizontal bar chart */}
              {waiterChartData.length > 1 && (
                <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 mb-3" style={{ height: Math.max(150, waiterChartData.length * 40 + 20) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waiterChartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                      <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={LABEL_STYLE}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                        formatter={(v: number, name: string) => [name === 'total' ? `$${v.toLocaleString()}` : v, name === 'total' ? 'Ventas' : 'Pedidos']}
                      />
                      <Bar dataKey="total" fill="#4A8C6F" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* List */}
              <div className="space-y-1.5">
                {waiterList.map((w, i) => {
                  const maxTotal = waiterList[0]?.total ?? 1;
                  const barWidth = Math.max(8, (w.total / maxTotal) * 100);
                  return (
                    <div key={w.user?.id ?? i} className="flex items-center bg-tonalli-black-card border border-subtle rounded-xl p-3 gap-3">
                      <div className="w-8 h-8 rounded-full bg-jade-glow flex items-center justify-center shrink-0">
                        <span className="text-jade text-sm font-semibold">{(w.user?.name ?? '?').charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{w.user?.name ?? 'Desconocido'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1.5 bg-tonalli-black rounded-full overflow-hidden">
                            <div className="h-full bg-jade/40 rounded-full" style={{ width: `${barWidth}%` }} />
                          </div>
                          <span className="text-silver-dark text-[11px] shrink-0">{w.orders} pedidos</span>
                        </div>
                      </div>
                      <span className="text-jade text-[15px] font-semibold shrink-0">${w.total.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tips by Waiter ── */}
          {tipsData && tipsData.waiters.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <HandCoins size={16} className="text-gold" />
                <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">PROPINAS POR MESERO</p>
              </div>
              <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 mb-3 flex items-center justify-between">
                <div>
                  <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px]">PROPINAS TOTALES</p>
                  <p className="text-gold text-2xl font-semibold">${tipsData.grandTotal.toLocaleString()}</p>
                </div>
                <p className="text-silver-dark text-xs">{tipsData.totalPaymentsWithTip} pagos con propina</p>
              </div>
              <div className="space-y-1.5">
                {tipsData.waiters.map((w) => (
                  <div key={w.userId} className="flex items-center bg-tonalli-black-card border border-subtle rounded-xl p-3 gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-glow flex items-center justify-center shrink-0">
                      <span className="text-gold text-sm font-semibold">{w.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{w.name}</p>
                      <p className="text-silver-dark text-[11px]">
                        {w.count} propinas
                        {w.byMethod.length > 0 && (
                          <> · {w.byMethod.map(m => `${METHOD_LABELS[m.method] ?? m.method}: $${m.total.toFixed(0)}`).join(', ')}</>
                        )}
                      </p>
                    </div>
                    <span className="text-gold text-[15px] font-semibold shrink-0">${w.totalTips.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════ */}
      {/* COSTS TAB                          */}
      {/* ═══════════════════════════════════ */}
      {reportTab === 'costs' && (
        <>
          {costsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
          ) : (
            <>
              {/* Summary cards */}
              {productCosts && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 space-y-1.5">
                    <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px]">MARGEN PROM.</p>
                    <p className={`text-2xl font-semibold ${marginColor(productCosts.summary.averageMarginPercent)}`}>
                      {productCosts.summary.averageMarginPercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 space-y-1.5">
                    <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px]">MEJOR MARGEN</p>
                    <p className="text-jade text-sm font-medium truncate">{productCosts.summary.highestMarginProduct ?? '-'}</p>
                  </div>
                  <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 space-y-1.5">
                    <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px]">MENOR MARGEN</p>
                    <p className="text-red-400 text-sm font-medium truncate">{productCosts.summary.lowestMarginProduct ?? '-'}</p>
                  </div>
                </div>
              )}

              {/* ── Margins Bar Chart (Price vs Cost) ── */}
              {marginChartData.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={14} className="text-gold" />
                    <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">PRECIO VS COSTO</p>
                  </div>
                  <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4" style={{ height: Math.max(220, marginChartData.length * 32 + 40) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={marginChartData} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={95} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelStyle={LABEL_STYLE}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                          formatter={(v: number, name: string) => {
                            if (name === 'precio') return [`$${v.toFixed(0)}`, 'Precio'];
                            if (name === 'costo') return [`$${v.toFixed(0)}`, 'Costo'];
                            return [`${v.toFixed(0)}%`, 'Margen'];
                          }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }}
                          formatter={(value: string) => value === 'precio' ? 'Precio' : 'Costo'}
                        />
                        <Bar dataKey="precio" fill="#C9A84C" radius={[0, 4, 4, 0]} barSize={12} />
                        <Bar dataKey="costo" fill="#E57373" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Product costs expandable list */}
              {costProducts.length > 0 && (
                <div className="mb-6">
                  <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">DETALLE POR PRODUCTO</p>
                  <div className="space-y-1.5">
                    {costProducts.filter(p => p.recipeItems.length > 0).map(p => {
                      const isExpanded = expandedProduct === p.productId;
                      return (
                        <div key={p.productId} className="bg-tonalli-black-card border border-subtle rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedProduct(isExpanded ? null : p.productId)}
                            className="w-full flex items-center p-3 gap-3 hover:bg-tonalli-black-soft transition-colors"
                          >
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-white text-sm font-medium truncate">{p.productName}</p>
                            </div>
                            <span className="text-silver-dark text-xs shrink-0">${p.price.toFixed(0)}</span>
                            <span className="text-red-400/80 text-xs shrink-0">-${p.recipeCost.toFixed(0)}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${marginColor(p.marginPercent)} ${marginBg(p.marginPercent)}`}>
                              {p.marginPercent.toFixed(0)}%
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-silver-dark shrink-0" /> : <ChevronDown size={14} className="text-silver-dark shrink-0" />}
                          </button>
                          {isExpanded && (
                            <div className="border-t border-light-border px-3 py-2 space-y-1">
                              {p.recipeItems.map((ri, idx) => (
                                <div key={idx} className="flex items-center text-xs">
                                  <span className="text-silver flex-1">{ri.ingredientName}</span>
                                  <span className="text-silver-dark">{ri.quantity} {ri.unit}</span>
                                  <span className="text-gold ml-3 w-16 text-right">${ri.lineCost.toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="flex items-center text-xs pt-1 border-t border-light-border">
                                <span className="text-silver-muted flex-1">Total costo</span>
                                <span className="text-gold font-semibold">${p.recipeCost.toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Ingredient Consumption Chart ── */}
              {consumptionChartData.length > 0 && (
                <div className="mb-6">
                  <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">COSTOS POR INGREDIENTE</p>
                  <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4" style={{ height: Math.max(180, consumptionChartData.length * 32 + 20) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={consumptionChartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                        <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={95} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelStyle={LABEL_STYLE}
                          labelFormatter={(_, payload) => {
                            const p = payload?.[0]?.payload;
                            return p ? `${p.fullName} (${p.consumido.toFixed(1)} ${p.unit})` : '';
                          }}
                          formatter={(v: number) => [`$${v.toLocaleString()}`, 'Costo']}
                        />
                        <Bar dataKey="costo" fill="#FF8A65" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Ingredient consumption list */}
              {consumptionList.length > 0 && (
                <div className="mb-6">
                  <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">DETALLE CONSUMO</p>
                  <div className="space-y-1.5">
                    {consumptionList.filter(c => c.totalConsumed > 0 || c.totalPurchased > 0).map(c => (
                      <div key={c.ingredientName} className="flex items-center bg-tonalli-black-card border border-subtle rounded-xl p-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{c.ingredientName}</p>
                          <p className="text-silver-dark text-[11px]">
                            Consumido: {c.totalConsumed.toFixed(1)} {c.unit} · Comprado: {c.totalPurchased.toFixed(1)} {c.unit}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-gold text-sm font-semibold">${c.costOfConsumption.toFixed(0)}</p>
                          <p className="text-silver-dark text-[11px]">Stock: {c.currentStock.toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {consumption && (
                    <div className="mt-3 bg-tonalli-black-card border border-subtle rounded-xl p-3 flex justify-between items-center">
                      <span className="text-silver-muted text-sm">Costo total de bienes vendidos (COGS)</span>
                      <span className="text-gold text-lg font-semibold">${consumption.totalCostOfGoods.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
