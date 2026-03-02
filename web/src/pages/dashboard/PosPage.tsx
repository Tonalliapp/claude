import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, CreditCard, Banknote, ArrowRightLeft, Lock, Unlock, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { CashRegister, PaymentsResponse, Order, OrdersResponse } from '@/types';
import Modal from '@/components/ui/Modal';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';
import PosNewSale from './components/PosNewSale';

const METHODS = [
  { key: 'cash' as const, icon: Banknote, label: 'Efectivo', color: 'text-jade' },
  { key: 'card' as const, icon: CreditCard, label: 'Tarjeta', color: 'text-gold' },
  { key: 'transfer' as const, icon: ArrowRightLeft, label: 'Transferencia', color: 'text-silver' },
];

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
  const [showNewSale, setShowNewSale] = useState(false);

  const { data: register, isLoading: regLoading, refetch: refetchReg } = useQuery({
    queryKey: ['cash-register'],
    queryFn: () => apiFetch<CashRegister>('/cash-register/current', { auth: true }).catch(() => null),
  });

  const { data: paymentsData, refetch: refetchPay } = useQuery({
    queryKey: ['payments-today'],
    queryFn: () => { const d = new Date().toISOString().split('T')[0]; return apiFetch<PaymentsResponse>(`/payments?from=${d}&to=${d}`, { auth: true }).catch(() => ({ payments: [], total: 0, page: 1, limit: 50 })); },
  });

  const { data: delivered } = useQuery({
    queryKey: ['delivered-orders'],
    queryFn: () => apiFetch<OrdersResponse>('/orders?status=delivered&limit=50', { auth: true }),
    refetchInterval: 15000,
  });

  const inv = () => { queryClient.invalidateQueries({ queryKey: ['cash-register'] }); queryClient.invalidateQueries({ queryKey: ['payments-today'] }); queryClient.invalidateQueries({ queryKey: ['delivered-orders'] }); queryClient.invalidateQueries({ queryKey: ['orders'] }); queryClient.invalidateQueries({ queryKey: ['tables'] }); };

  const openMut = useMutation({
    mutationFn: (a: number) => apiFetch('/cash-register/open', { method: 'POST', body: { openingAmount: a }, auth: true }),
    onSuccess: () => { inv(); setShowOpen(false); toast.success('Caja abierta'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMut = useMutation({
    mutationFn: (d: { closingAmount: number; notes?: string }) => apiFetch('/cash-register/close', { method: 'POST', body: d, auth: true }),
    onSuccess: () => { inv(); setShowClose(false); setCloseAmt(''); setCloseNotes(''); toast.success('Caja cerrada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const payMut = useMutation({
    mutationFn: (d: { orderId: string; method: string; amount: number; reference?: string }) => apiFetch('/payments', { method: 'POST', body: d, auth: true }),
    onSuccess: () => { inv(); setShowPay(false); setSelOrder(null); setPayRef(''); toast.success('Pago registrado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const isOpen = register && register.status === 'open';
  const payList = paymentsData?.payments ?? [];
  const total = payList.reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-white text-xl font-light tracking-wide flex-1">Caja / POS</h2>
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
          <button onClick={() => setShowOpen(true)} className="bg-gold hover:bg-gold-light text-tonalli-black px-8 py-3 rounded-xl font-semibold transition-colors">
            Abrir Caja
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4">
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px] mb-1.5">APERTURA</p>
              <p className="text-gold text-xl font-semibold">${(register!.openingAmount ?? 0).toFixed(2)}</p>
            </div>
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4">
              <p className="text-silver-muted text-[9px] font-medium tracking-[1.5px] mb-1.5">COBRADO HOY</p>
              <p className="text-jade text-xl font-semibold">${total.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button onClick={() => setShowNewSale(true)} className="flex-1 flex items-center justify-center gap-2 bg-jade hover:bg-jade-light text-white py-3 rounded-xl font-semibold transition-colors">
              <Plus size={18} />
              Nueva Venta
            </button>
            <button onClick={() => setShowClose(true)} className="flex-1 border border-gold text-gold py-3 rounded-xl font-semibold hover:bg-gold/10 transition-colors">
              Cerrar Caja
            </button>
          </div>

          {(delivered?.orders?.length ?? 0) > 0 && (
            <>
              <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">PEDIDOS POR COBRAR</p>
              <div className="space-y-2 mb-6">
                {delivered!.orders.map(o => (
                  <button key={o.id} onClick={() => { setSelOrder(o); setPayMethod('cash'); setPayRef(''); setShowPay(true); }} className="w-full flex justify-between items-center bg-tonalli-black-card border border-subtle rounded-xl p-3.5 hover:border-gold-border transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-white text-[15px] font-semibold">#{String(o.orderNumber).padStart(3, '0')}</span>
                      <span className="text-jade-light text-xs">{o.table ? `Mesa ${o.table.number}` : o.orderType === 'takeout' ? 'Para Llevar' : o.orderType === 'delivery' ? 'Domicilio' : 'Mostrador'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gold text-base font-semibold">${o.total.toFixed(2)}</span>
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
                      <span className="text-gold text-sm font-semibold ml-2">${p.amount.toFixed(2)}</span>
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

      {/* New Sale Modal */}
      {showNewSale && (
        <PosNewSale onClose={() => setShowNewSale(false)} onSuccess={() => { inv(); setShowNewSale(false); }} />
      )}

      {/* Pay Modal */}
      {showPay && selOrder && (
        <Modal title={`Cobrar #${String(selOrder.orderNumber).padStart(3, '0')}`} onClose={() => setShowPay(false)}>
          <div className="text-center mb-2">
            <p className="text-silver-muted text-[10px] tracking-[2px]">TOTAL A COBRAR</p>
            <p className="text-gold text-4xl font-semibold">${selOrder.total.toFixed(2)}</p>
          </div>
          <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">MÉTODO DE PAGO</p>
          <div className="flex gap-2">
            {METHODS.map(m => (
              <button key={m.key} onClick={() => setPayMethod(m.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-colors ${payMethod === m.key ? 'border-gold bg-status-pending text-gold' : 'border-light-border bg-tonalli-black-card text-silver-dark'}`}>
                <m.icon size={16} />
                {m.label}
              </button>
            ))}
          </div>
          {payMethod !== 'cash' && <InputField label="REFERENCIA" value={payRef} onChange={setPayRef} placeholder="No. de voucher o referencia" />}
          <GoldButton loading={payMut.isPending} onClick={() => payMut.mutate({ orderId: selOrder.id, method: payMethod, amount: selOrder.total, ...(payRef.trim() ? { reference: payRef.trim() } : {}) })}>Cobrar</GoldButton>
        </Modal>
      )}
    </div>
  );
}
