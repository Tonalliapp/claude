import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, CreditCard, Banknote, ArrowRightLeft, Lock, Unlock,
  Plus, Truck, Store, ShoppingBag, UtensilsCrossed, Clock, ChevronRight, X,
  TrendingUp, TrendingDown, FileText, Loader2, Download, ShieldCheck, AlertTriangle, Keyboard,
} from 'lucide-react';
import { useHotkeys } from '@/hooks/useHotkeys';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type {
  CashRegister, CashMovement, PaymentsResponse, Order, OrdersResponse,
  CashRegisterCloseResponse, CashRegisterHistoryResponse, CashRegisterSummary,
} from '@/types';
import Modal from '@/components/ui/Modal';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';
import PosNewSale from './components/PosNewSale';

const METHODS = [
  { key: 'cash' as const, icon: Banknote, label: 'Efectivo', color: 'text-jade' },
  { key: 'card' as const, icon: CreditCard, label: 'Tarjeta', color: 'text-gold' },
  { key: 'transfer' as const, icon: ArrowRightLeft, label: 'Transferencia', color: 'text-silver' },
];

function SourceBadge({ order }: { order: Order }) {
  if (order.source === 'yesswera') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 text-[11px] font-medium">
        <Truck size={12} />
        Yesswera
      </span>
    );
  }
  if (order.table) {
    return (
      <span className="inline-flex items-center gap-1 text-jade-light text-xs">
        <UtensilsCrossed size={12} />
        Mesa {order.table.number}
      </span>
    );
  }
  if (order.orderType === 'takeout') {
    return (
      <span className="inline-flex items-center gap-1 text-silver text-xs">
        <ShoppingBag size={12} />
        Para Llevar
      </span>
    );
  }
  if (order.orderType === 'delivery') {
    return (
      <span className="inline-flex items-center gap-1 text-orange-400 text-xs">
        <Truck size={12} />
        Domicilio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-silver text-xs">
      <Store size={12} />
      Mostrador
    </span>
  );
}

function BreakdownSection({ title, data }: { title: string; data: Record<string, { count: number; total: number }> }) {
  return (
    <div className="mb-4">
      <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-2">{title}</p>
      <div className="space-y-1.5">
        {Object.entries(data).map(([key, val]) => {
          const M = METHODS.find((m) => m.key === key);
          const label = M?.label ?? (key === 'tonalli' ? 'Tonalli' : key === 'yesswera' ? 'Yesswera' : key);
          return (
            <div key={key} className="flex items-center justify-between bg-tonalli-black-card rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                {M && <M.icon size={14} className={M.color} />}
                {key === 'yesswera' && <Truck size={14} className="text-orange-400" />}
                <span className="text-silver text-sm">{label}</span>
                <span className="text-silver-dark text-xs">({val.count})</span>
              </div>
              <span className="text-gold text-sm font-semibold">${val.total.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PosPage() {
  const queryClient = useQueryClient();
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [openAmt, setOpenAmt] = useState('500');
  const [closeAmt, setCloseAmt] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [selOrder, setSelOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [payRef, setPayRef] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [showNewSale, setShowNewSale] = useState(false);
  const [closeResult, setCloseResult] = useState<CashRegisterCloseResponse | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSummary, setShowSummary] = useState<CashRegisterSummary | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [showMovement, setShowMovement] = useState(false);
  const [movType, setMovType] = useState<'deposit' | 'withdrawal' | 'expense'>('deposit');
  const [movAmt, setMovAmt] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [reportGenerating, setReportGenerating] = useState(false);

  const { data: register } = useQuery({
    queryKey: ['cash-register'],
    queryFn: () => apiFetch<CashRegister>('/cash-register/current', { auth: true }).catch(() => null),
    refetchInterval: 30000,
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments-today'],
    queryFn: () => { const d = new Date().toISOString().split('T')[0]; return apiFetch<PaymentsResponse>(`/payments?from=${d}T00:00:00.000Z&to=${d}T23:59:59.999Z`, { auth: true }).catch(() => ({ payments: [], total: 0, page: 1, limit: 50 })); },
    refetchInterval: 30000,
  });

  const { data: delivered } = useQuery({
    queryKey: ['delivered-orders'],
    queryFn: () => apiFetch<OrdersResponse>('/orders?status=delivered&limit=50', { auth: true }),
    refetchInterval: 15000,
  });

  const { data: historyData } = useQuery({
    queryKey: ['cash-register-history', historyPage],
    queryFn: () => apiFetch<CashRegisterHistoryResponse>(`/cash-register/history?page=${historyPage}&limit=10`, { auth: true }),
    enabled: showHistory,
  });

  const inv = () => { queryClient.invalidateQueries({ queryKey: ['cash-register'] }); queryClient.invalidateQueries({ queryKey: ['payments-today'] }); queryClient.invalidateQueries({ queryKey: ['delivered-orders'] }); queryClient.invalidateQueries({ queryKey: ['orders'] }); queryClient.invalidateQueries({ queryKey: ['tables'] }); };

  const openMut = useMutation({
    mutationFn: (a: number) => apiFetch('/cash-register/open', { method: 'POST', body: { openingAmount: a }, auth: true }),
    onSuccess: () => { inv(); setShowOpen(false); setShowHistory(false); toast.success('Caja abierta'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMut = useMutation({
    mutationFn: (d: { closingAmount: number; notes?: string }) => apiFetch<CashRegisterCloseResponse>('/cash-register/close', { method: 'POST', body: d, auth: true }),
    onSuccess: (data) => { inv(); setShowClose(false); setCloseAmt(''); setCloseNotes(''); setCloseResult(data); },
    onError: (e: Error) => toast.error(e.message),
  });

  const payMut = useMutation({
    mutationFn: (d: { orderId: string; method: string; amount: number; reference?: string }) => apiFetch('/payments', { method: 'POST', body: d, auth: true }),
    onSuccess: () => { inv(); setShowPay(false); setSelOrder(null); setPayRef(''); toast.success('Pago registrado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const movMut = useMutation({
    mutationFn: (d: { type: string; amount: number; description?: string }) => apiFetch('/cash-register/movement', { method: 'POST', body: d, auth: true }),
    onSuccess: () => { inv(); setShowMovement(false); setMovAmt(''); setMovDesc(''); toast.success('Movimiento registrado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [showShortcuts, setShowShortcuts] = useState(false);

  const hotkeys = useMemo(() => ({
    'f1': () => { if (!isOpenRef.current) setShowOpen(true); },
    'f2': () => { if (isOpenRef.current) setShowNewSale(true); },
    'f3': () => setShowHistory(true),
    'f4': () => { if (isOpenRef.current) setShowClose(true); },
    'f5': () => { if (isOpenRef.current) { setMovType('deposit'); setMovAmt(''); setMovDesc(''); setShowMovement(true); } },
    'escape': () => { setShowOpen(false); setShowClose(false); setShowPay(false); setShowNewSale(false); setShowHistory(false); setShowMovement(false); setCloseResult(null); setShowSummary(null); setShowShortcuts(false); },
    '?': () => setShowShortcuts(s => !s),
  }), []);
  useHotkeys(hotkeys);

  // Ref to avoid stale closure in hotkeys
  const isOpenRef = { current: register?.status === 'open' };

  const isOpen = register && register.status === 'open';
  const payList = paymentsData?.payments ?? [];
  const total = payList.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  // Live breakdown from today's payments
  const liveBreakdown = payList.reduce((acc, p) => {
    if (!acc[p.method]) acc[p.method] = { count: 0, total: 0 };
    acc[p.method].count += 1;
    acc[p.method].total += Number(p.amount ?? 0);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const fetchSummary = async (id: string) => {
    try {
      const data = await apiFetch<CashRegisterSummary>(`/cash-register/${id}/summary`, { auth: true });
      setShowSummary(data);
    } catch {
      toast.error('Error al cargar resumen');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-white text-xl font-light tracking-wide flex-1">Caja / POS</h2>
        <button
          onClick={() => setShowShortcuts(true)}
          className="p-2 rounded-lg text-silver-dark hover:text-silver hover:bg-tonalli-black-card transition-colors"
          title="Atajos de teclado (?)"
        >
          <Keyboard size={16} />
        </button>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${isOpen ? 'bg-jade-glow' : 'bg-status-preparing'}`}>
          {isOpen ? <Unlock size={12} className="text-jade" /> : <Lock size={12} className="text-silver-dark" />}
          <span className={`text-[11px] font-semibold ${isOpen ? 'text-jade' : 'text-silver-dark'}`}>{isOpen ? 'Abierta' : 'Cerrada'}</span>
        </div>
      </div>

      {!isOpen ? (
        <div className="text-center py-16">
          <Lock size={32} className="text-silver-dark mx-auto mb-3" />
          <p className="text-white text-xl font-light mb-1">Caja Cerrada</p>
          <p className="text-silver-muted text-sm mb-6">Abre la caja para empezar a cobrar</p>
          <div className="flex flex-col items-center gap-3">
            <button onClick={() => setShowOpen(true)} className="bg-gold hover:bg-gold-light text-tonalli-black px-8 py-3 rounded-xl font-semibold transition-colors">
              Abrir Caja
            </button>
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-silver-muted hover:text-silver text-sm transition-colors">
              <Clock size={14} />
              Ver Historial de Turnos
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4">
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px] mb-1.5">APERTURA</p>
              <p className="text-gold text-xl font-semibold">${Number(register!.openingAmount ?? 0).toFixed(2)}</p>
            </div>
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4">
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px] mb-1.5">COBRADO HOY</p>
              <p className="text-jade text-xl font-semibold">${total.toFixed(2)}</p>
            </div>
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4">
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px] mb-1.5">EN CAJA</p>
              <p className="text-white text-xl font-semibold">${(() => {
                const opening = Number(register!.openingAmount ?? 0);
                const cashSales = liveBreakdown['cash']?.total ?? 0;
                const movs = register?.movements ?? [];
                const deposits = movs.filter(m => m.type === 'deposit').reduce((s, m) => s + Number(m.amount), 0);
                const withdrawals = movs.filter(m => m.type !== 'deposit').reduce((s, m) => s + Number(m.amount), 0);
                return (opening + cashSales + deposits - withdrawals).toFixed(2);
              })()}</p>
            </div>
          </div>

          {/* Live breakdown by method */}
          {Object.keys(liveBreakdown).length > 0 && (
            <div className="flex gap-2 mb-4">
              {METHODS.map((m) => {
                const val = liveBreakdown[m.key];
                if (!val) return null;
                return (
                  <div key={m.key} className="flex-1 bg-tonalli-black-card border border-subtle rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <m.icon size={12} className={m.color} />
                      <span className="text-silver-muted text-[9px] tracking-[1px]">{m.label.toUpperCase()}</span>
                    </div>
                    <p className="text-white text-sm font-semibold">${val.total.toFixed(2)}</p>
                    <p className="text-silver-dark text-[10px]">{val.count} cobros</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <button onClick={() => setShowNewSale(true)} className="flex-1 flex items-center justify-center gap-2 bg-jade hover:bg-jade-light text-white py-3 rounded-xl font-semibold transition-colors">
              <Plus size={18} />
              Nueva Venta
            </button>
            <button onClick={() => setShowClose(true)} className="flex-1 border border-gold text-gold py-3 rounded-xl font-semibold hover:bg-gold/10 transition-colors">
              Cerrar Caja
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => { setMovType('deposit'); setMovAmt(''); setMovDesc(''); setShowMovement(true); }} className="flex-1 flex items-center justify-center gap-1.5 bg-tonalli-black-card border border-subtle rounded-xl py-2.5 text-jade text-xs font-medium hover:border-jade/30 transition-colors">
              <TrendingUp size={14} />
              Fondeo
            </button>
            <button onClick={() => { setMovType('withdrawal'); setMovAmt(''); setMovDesc(''); setShowMovement(true); }} className="flex-1 flex items-center justify-center gap-1.5 bg-tonalli-black-card border border-subtle rounded-xl py-2.5 text-red-400 text-xs font-medium hover:border-red-500/30 transition-colors">
              <TrendingDown size={14} />
              Retiro
            </button>
            <button onClick={() => { setMovType('expense'); setMovAmt(''); setMovDesc(''); setShowMovement(true); }} className="flex-1 flex items-center justify-center gap-1.5 bg-tonalli-black-card border border-subtle rounded-xl py-2.5 text-orange-400 text-xs font-medium hover:border-orange-500/30 transition-colors">
              <FileText size={14} />
              Gasto
            </button>
          </div>

          {/* Movements list */}
          {(register?.movements?.length ?? 0) > 0 && (
            <>
              <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">MOVIMIENTOS</p>
              <div className="space-y-1.5 mb-6">
                {register!.movements!.map((m: CashMovement) => {
                  const isDeposit = m.type === 'deposit';
                  const isExpense = m.type === 'expense';
                  return (
                    <div key={m.id} className="flex items-center gap-2 bg-tonalli-black-card rounded-lg px-3 py-2.5">
                      {isDeposit ? <TrendingUp size={14} className="text-jade" /> : isExpense ? <FileText size={14} className="text-orange-400" /> : <TrendingDown size={14} className="text-red-400" />}
                      <span className={`text-[13px] font-medium ${isDeposit ? 'text-jade' : isExpense ? 'text-orange-400' : 'text-red-400'}`}>
                        {isDeposit ? 'Fondeo' : isExpense ? 'Gasto' : 'Retiro'}
                      </span>
                      <span className="flex-1 text-silver-dark text-[11px] truncate">{m.description || ''}</span>
                      <span className={`text-sm font-semibold ${isDeposit ? 'text-jade' : 'text-red-400'}`}>
                        {isDeposit ? '+' : '-'}${Number(m.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-silver-muted hover:text-silver text-xs transition-colors mb-4">
            <Clock size={12} />
            Ver Historial de Turnos
          </button>

          {(delivered?.orders?.length ?? 0) > 0 && (
            <>
              <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">PEDIDOS POR COBRAR</p>
              <div className="space-y-2 mb-6">
                {delivered!.orders.map(o => (
                  <button key={o.id} onClick={() => { setSelOrder(o); setPayMethod('cash'); setPayRef(''); setShowPay(true); }} className="w-full flex justify-between items-center bg-tonalli-black-card border border-subtle rounded-xl p-3.5 hover:border-gold-border transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-white text-[15px] font-semibold">#{String(o.orderNumber).padStart(3, '0')}</span>
                      <SourceBadge order={o} />
                      {o.customerName && <span className="text-silver-dark text-xs">{o.customerName}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gold text-base font-semibold">${Number(o.total).toFixed(2)}</span>
                      <DollarSign size={16} className="text-gold" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {payList.length > 0 && (
            <>
              <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">COBROS DE HOY</p>
              <div className="space-y-1.5">
                {payList.slice(0, 20).map(p => {
                  const M = METHODS.find(m => m.key === p.method);
                  return (
                    <div key={p.id} className="flex items-center gap-2 bg-tonalli-black-card rounded-lg px-3 py-2.5">
                      {M && <M.icon size={16} className={M.color} />}
                      <span className="text-silver text-[13px] font-medium">{M?.label ?? p.method}</span>
                      <span className="flex-1 text-right text-silver-dark text-[11px]">{p.reference ? `Ref: ${p.reference}` : ''}</span>
                      <span className="text-gold text-sm font-semibold ml-2">${Number(p.amount).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Open Modal */}
      {showOpen && (
        <Modal title="Abrir Caja" onClose={() => setShowOpen(false)}>
          <InputField label="MONTO INICIAL" value={openAmt} onChange={setOpenAmt} type="number" placeholder="500.00" />
          <GoldButton loading={openMut.isPending} onClick={() => openMut.mutate(parseFloat(openAmt) || 0)}>Abrir Caja</GoldButton>
        </Modal>
      )}

      {/* Close Modal */}
      {showClose && (
        <Modal title="Cerrar Caja" onClose={() => setShowClose(false)}>
          <InputField label="MONTO EN CAJA" value={closeAmt} onChange={setCloseAmt} type="number" placeholder="12500.00" />
          <InputField label="NOTAS (OPCIONAL)" value={closeNotes} onChange={setCloseNotes} placeholder="Observaciones del turno" />
          <GoldButton loading={closeMut.isPending} onClick={() => closeMut.mutate({ closingAmount: parseFloat(closeAmt) || 0, ...(closeNotes.trim() ? { notes: closeNotes.trim() } : {}) })}>Cerrar Caja</GoldButton>
        </Modal>
      )}

      {/* Close Result Modal — preview + digital signature */}
      {closeResult && (
        <Modal title="Reporte de Cierre" onClose={() => setCloseResult(null)}>
          <div className="text-center mb-4">
            <p className="text-silver-muted text-[10px] tracking-[2px] mb-1">DIFERENCIA</p>
            <p className={`text-3xl font-semibold ${closeResult.difference === 0 ? 'text-jade' : closeResult.difference > 0 ? 'text-jade' : 'text-red-400'}`}>
              {closeResult.difference >= 0 ? '+' : ''}${closeResult.difference.toFixed(2)}
            </p>
            <p className="text-silver-dark text-xs mt-1">{closeResult.totalTransactions} transacciones | Total: ${closeResult.totalSales.toFixed(2)}</p>
            <div className="flex justify-center gap-6 mt-2 text-xs text-silver-dark">
              <span>Esperado: <span className="text-silver">${Number(closeResult.expectedAmount ?? 0).toFixed(2)}</span></span>
              <span>Contado: <span className="text-silver">${Number(closeResult.closingAmount ?? 0).toFixed(2)}</span></span>
            </div>
          </div>
          <BreakdownSection title="DESGLOSE POR METODO" data={closeResult.breakdown} />
          {Object.keys(closeResult.bySource).length > 0 && (
            <BreakdownSection title="DESGLOSE POR FUENTE" data={closeResult.bySource} />
          )}
          {(closeResult.movements?.length ?? 0) > 0 && (
            <div className="mb-4">
              <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-2">MOVIMIENTOS DE CAJA</p>
              <div className="space-y-1.5">
                {closeResult.movements!.map((m: { id: string; type: string; amount: number | string; description?: string | null }) => (
                  <div key={m.id} className="flex items-center justify-between bg-tonalli-black-card rounded-lg px-3 py-2">
                    <span className={`text-sm ${m.type === 'deposit' ? 'text-jade' : m.type === 'expense' ? 'text-orange-400' : 'text-red-400'}`}>
                      {m.type === 'deposit' ? 'Fondeo' : m.type === 'expense' ? 'Gasto' : 'Retiro'}
                    </span>
                    <span className="text-silver-dark text-xs flex-1 text-center truncate px-2">{m.description || ''}</span>
                    <span className={`text-sm font-semibold ${m.type === 'deposit' ? 'text-jade' : 'text-red-400'}`}>
                      {m.type === 'deposit' ? '+' : '-'}${Number(m.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Digital Signature Section */}
          <div className="border border-gold-border rounded-xl p-4 mb-4 bg-status-pending">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle size={16} className="text-gold mt-0.5 shrink-0" />
              <p className="text-silver text-xs leading-relaxed">
                Este reporte lleva tu <span className="text-gold font-semibold">firma digital</span>. Al aceptar, confirmas que los datos presentados son correctos y que estas de acuerdo con el cierre.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <ShieldCheck size={14} className="text-jade" />
              <p className="text-silver-dark text-[11px]">
                Firmado por: <span className="text-silver font-medium">{closeResult.user.name}</span> — {new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setCloseResult(null)} className="flex-1 border border-subtle text-silver py-3 rounded-xl font-semibold hover:bg-tonalli-black-card transition-colors">
              Cerrar sin firmar
            </button>
            <button
              disabled={reportGenerating}
              onClick={async () => {
                setReportGenerating(true);
                try {
                  const result = await apiFetch<{ reportUrl: string }>(`/cash-register/${closeResult.id}/generate-report`, {
                    method: 'POST',
                    body: { signedBy: closeResult.user.name },
                    auth: true,
                  });
                  toast.success('Reporte generado y firmado');
                  window.open(result.reportUrl, '_blank');
                  setCloseResult(null);
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : 'Error al generar reporte');
                } finally {
                  setReportGenerating(false);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-jade hover:bg-jade-light text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {reportGenerating ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Acepto y Firmar
            </button>
          </div>
        </Modal>
      )}

      {/* History View */}
      {showHistory && (
        <Modal title="Historial de Turnos" onClose={() => setShowHistory(false)}>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(historyData?.registers ?? []).map((reg) => (
              <button
                key={reg.id}
                onClick={() => fetchSummary(reg.id)}
                className="w-full flex items-center justify-between bg-tonalli-black-card border border-subtle rounded-xl p-3.5 hover:border-gold-border transition-colors"
              >
                <div className="text-left">
                  <p className="text-white text-sm font-medium">
                    {reg.closedAt ? new Date(reg.closedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                  <p className="text-silver-dark text-xs">{reg.user.name} | {reg._count.payments} cobros</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-gold text-sm font-semibold">${Number(reg.salesTotal).toFixed(2)}</p>
                    {reg.expectedAmount != null && reg.closingAmount != null && (
                      <p className={`text-[11px] ${Number(reg.closingAmount) - Number(reg.expectedAmount) === 0 ? 'text-jade' : 'text-red-400'}`}>
                        Dif: ${(Number(reg.closingAmount) - Number(reg.expectedAmount)).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-silver-dark" />
                </div>
              </button>
            ))}
            {(historyData?.registers ?? []).length === 0 && (
              <p className="text-silver-muted text-sm text-center py-8">Sin turnos anteriores</p>
            )}
          </div>
          {historyData && historyData.total > historyData.limit && (
            <div className="flex justify-center gap-2 mt-3">
              <button disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => p - 1)} className="px-3 py-1.5 text-xs text-silver-dark border border-subtle rounded-lg disabled:opacity-30 hover:text-silver">Anterior</button>
              <span className="px-3 py-1.5 text-xs text-silver-dark">{historyPage} / {Math.ceil(historyData.total / historyData.limit)}</span>
              <button disabled={historyPage >= Math.ceil(historyData.total / historyData.limit)} onClick={() => setHistoryPage((p) => p + 1)} className="px-3 py-1.5 text-xs text-silver-dark border border-subtle rounded-lg disabled:opacity-30 hover:text-silver">Siguiente</button>
            </div>
          )}
        </Modal>
      )}

      {/* Summary Modal */}
      {showSummary && (
        <Modal title={`Resumen — ${showSummary.register.closedAt ? new Date(showSummary.register.closedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}`} onClose={() => setShowSummary(null)}>
          <div className="text-center mb-4">
            <p className="text-silver-muted text-[10px] tracking-[2px] mb-1">DIFERENCIA</p>
            <p className={`text-3xl font-semibold ${showSummary.difference === 0 ? 'text-jade' : showSummary.difference > 0 ? 'text-jade' : 'text-red-400'}`}>
              {showSummary.difference >= 0 ? '+' : ''}${showSummary.difference.toFixed(2)}
            </p>
            <p className="text-silver-dark text-xs mt-1">{showSummary.totalTransactions} transacciones | Total: ${showSummary.totalSales.toFixed(2)}</p>
            <p className="text-silver-dark text-xs">Apertura: ${Number(showSummary.register.openingAmount).toFixed(2)} | Cierre: ${Number(showSummary.register.closingAmount ?? 0).toFixed(2)}</p>
          </div>
          <BreakdownSection title="DESGLOSE POR METODO" data={showSummary.breakdown} />
          {Object.keys(showSummary.bySource).length > 0 && (
            <BreakdownSection title="DESGLOSE POR FUENTE" data={showSummary.bySource} />
          )}
          {(showSummary.register.movements?.length ?? 0) > 0 && (
            <div className="mb-4">
              <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-2">MOVIMIENTOS DE CAJA</p>
              <div className="space-y-1.5">
                {showSummary.register.movements!.map((m: { id: string; type: string; amount: number | string; description?: string | null }) => (
                  <div key={m.id} className="flex items-center justify-between bg-tonalli-black-card rounded-lg px-3 py-2">
                    <span className={`text-sm ${m.type === 'deposit' ? 'text-jade' : m.type === 'expense' ? 'text-orange-400' : 'text-red-400'}`}>
                      {m.type === 'deposit' ? 'Fondeo' : m.type === 'expense' ? 'Gasto' : 'Retiro'}
                    </span>
                    <span className="text-silver-dark text-xs flex-1 text-center truncate px-2">{m.description || ''}</span>
                    <span className={`text-sm font-semibold ${m.type === 'deposit' ? 'text-jade' : 'text-red-400'}`}>
                      {m.type === 'deposit' ? '+' : '-'}${Number(m.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature info + PDF download */}
          {showSummary.register.signedBy && (
            <div className="border border-jade/20 rounded-xl p-3 mb-4 bg-jade-glow">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} className="text-jade" />
                <span className="text-jade text-xs font-medium">Reporte firmado</span>
              </div>
              <p className="text-silver-dark text-[11px]">
                Firmado por: <span className="text-silver">{showSummary.register.signedBy}</span>
                {showSummary.register.signedAt && (
                  <> — {new Date(showSummary.register.signedAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {showSummary.register.reportUrl && (
              <button
                onClick={() => window.open(showSummary.register.reportUrl!, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 border border-gold text-gold py-3 rounded-xl font-semibold hover:bg-gold/10 transition-colors"
              >
                <Download size={16} />
                Descargar PDF
              </button>
            )}
            <GoldButton onClick={() => setShowSummary(null)}>Cerrar</GoldButton>
          </div>
        </Modal>
      )}

      {/* New Sale Modal */}
      {showNewSale && (
        <PosNewSale onClose={() => setShowNewSale(false)} onSuccess={() => { inv(); setShowNewSale(false); }} />
      )}

      {/* Pay Modal */}
      {showPay && selOrder && (
        <Modal title={`Cobrar #${String(selOrder.orderNumber).padStart(3, '0')}`} onClose={() => setShowPay(false)}>
          <div className="text-center mb-2">
            <p className="text-silver-muted text-[10px] tracking-[2px]">TOTAL A COBRAR</p>
            <p className="text-gold text-4xl font-semibold">${Number(selOrder.total).toFixed(2)}</p>
            <div className="mt-1"><SourceBadge order={selOrder} /></div>
            {selOrder.customerName && <p className="text-silver-dark text-xs mt-1">{selOrder.customerName}</p>}
            {selOrder.deliveryAddress && <p className="text-silver-dark text-xs">{selOrder.deliveryAddress}</p>}
          </div>
          <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">METODO DE PAGO</p>
          <div className="flex gap-2">
            {METHODS.map(m => (
              <button key={m.key} onClick={() => setPayMethod(m.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-colors ${payMethod === m.key ? 'border-gold bg-status-pending text-gold' : 'border-light-border bg-tonalli-black-card text-silver-dark'}`}>
                <m.icon size={16} />
                {m.label}
              </button>
            ))}
          </div>
          {payMethod !== 'cash' && <InputField label="REFERENCIA" value={payRef} onChange={setPayRef} placeholder="No. de voucher o referencia" />}
          <div>
            <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-1.5">PROPINA (OPCIONAL)</p>
            <div className="flex gap-2">
              {[0, 10, 15, 20].map(p => {
                const tipVal = p === 0 ? 0 : Number(selOrder.total) * p / 100;
                return (
                  <button
                    key={p}
                    onClick={() => setTipAmount(p === 0 ? '' : tipVal.toFixed(2))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      (p === 0 && !tipAmount) || tipAmount === tipVal.toFixed(2)
                        ? 'bg-jade/15 border border-jade/30 text-jade'
                        : 'bg-tonalli-black-card border border-subtle text-silver-dark'
                    }`}
                  >
                    {p === 0 ? 'Sin' : `${p}%`}
                  </button>
                );
              })}
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="$0"
                className="w-20 px-2 py-2 bg-tonalli-black-card border border-subtle rounded-lg text-white text-xs text-center focus:outline-none focus:border-gold-border"
              />
            </div>
          </div>
          <GoldButton loading={payMut.isPending} onClick={() => payMut.mutate({ orderId: selOrder.id, method: payMethod, amount: selOrder.total, ...(parseFloat(tipAmount) > 0 ? { tipAmount: parseFloat(tipAmount) } : {}), ...(payRef.trim() ? { reference: payRef.trim() } : {}) })}>
            Cobrar ${(Number(selOrder.total) + (parseFloat(tipAmount) || 0)).toFixed(2)}
            {parseFloat(tipAmount) > 0 && <span className="text-[10px] opacity-75 ml-1">(+${tipAmount} propina)</span>}
          </GoldButton>
        </Modal>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <Modal title="Atajos de Teclado" onClose={() => setShowShortcuts(false)}>
          <div className="space-y-2">
            {[
              ['F1', 'Abrir caja'],
              ['F2', 'Nueva venta'],
              ['F3', 'Historial de turnos'],
              ['F4', 'Cerrar caja'],
              ['F5', 'Fondeo / movimiento'],
              ['Esc', 'Cerrar modal'],
              ['?', 'Mostrar atajos'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between bg-tonalli-black-soft rounded-lg px-3 py-2">
                <span className="text-silver text-sm">{desc}</span>
                <kbd className="px-2 py-0.5 rounded bg-tonalli-black-card border border-subtle text-gold text-xs font-mono">{key}</kbd>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Movement Modal */}
      {showMovement && (
        <Modal title={movType === 'deposit' ? 'Fondeo' : movType === 'withdrawal' ? 'Retiro' : 'Gasto'} onClose={() => setShowMovement(false)}>
          <InputField label="MONTO" value={movAmt} onChange={setMovAmt} type="number" placeholder="0.00" />
          <InputField label="DESCRIPCION (OPCIONAL)" value={movDesc} onChange={setMovDesc} placeholder={movType === 'deposit' ? 'Ej: Cambio para caja' : movType === 'withdrawal' ? 'Ej: Envío a banco' : 'Ej: Compra de servilletas'} />
          <GoldButton
            loading={movMut.isPending}
            onClick={() => { const a = parseFloat(movAmt); if (!a || a <= 0) { toast.error('Ingresa un monto válido'); return; } movMut.mutate({ type: movType, amount: a, ...(movDesc.trim() ? { description: movDesc.trim() } : {}) }); }}
          >
            Registrar {movType === 'deposit' ? 'Fondeo' : movType === 'withdrawal' ? 'Retiro' : 'Gasto'}
          </GoldButton>
        </Modal>
      )}
    </div>
  );
}
