import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Loader2, ChevronDown, ChevronUp, DollarSign, Users, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { DeliveryDebtDriver, DeliveryDebtsSummary } from '@/types';
import Modal from '@/components/ui/Modal';
import GoldButton from '@/components/ui/GoldButton';

const TIER_STYLES: Record<string, { label: string; cls: string }> = {
  new: { label: 'Nuevo', cls: 'bg-gray-500/20 text-gray-400' },
  trusted: { label: 'Confiable', cls: 'bg-blue-500/20 text-blue-400' },
  verified: { label: 'Verificado', cls: 'bg-emerald-500/20 text-emerald-400' },
  blocked: { label: 'Bloqueado', cls: 'bg-red-500/20 text-red-400' },
};

export default function DeliveryDebtsPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DeliveryDebtDriver | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer'>('cash');

  const { data: debts, isLoading } = useQuery({
    queryKey: ['delivery-debts'],
    queryFn: () => apiFetch<DeliveryDebtDriver[]>('/delivery/debts', { auth: true }),
  });

  const { data: summary } = useQuery({
    queryKey: ['delivery-debts-summary'],
    queryFn: () => apiFetch<DeliveryDebtsSummary>('/delivery/debts/summary', { auth: true }),
  });

  const confirmMut = useMutation({
    mutationFn: (data: { driverName: string; driverPhone: string; amount: number; paymentMethod: string }) =>
      apiFetch('/delivery/debts/confirm-payment', { method: 'POST', body: data, auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-debts'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-debts-summary'] });
      toast.success('Pago confirmado y notificado a Yesswera');
      setShowConfirm(false);
      setSelectedDriver(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openConfirm = (driver: DeliveryDebtDriver) => {
    setSelectedDriver(driver);
    setPayAmount(driver.totalDebt.toFixed(2));
    setPayMethod('cash');
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (!selectedDriver) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto valido');
      return;
    }
    confirmMut.mutate({
      driverName: selectedDriver.driverName,
      driverPhone: selectedDriver.driverPhone,
      amount,
      paymentMethod: payMethod,
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Receipt size={20} className="text-orange-400" />
        </div>
        <h2 className="text-white text-xl font-light tracking-wide">Deudas de Delivery</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-tonalli-black-card border border-subtle rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-gold" />
            <span className="text-gold-muted text-[10px] tracking-[1px]">TOTAL ADEUDADO</span>
          </div>
          <p className="text-white text-xl font-semibold">${(summary?.totalDebt ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-tonalli-black-card border border-subtle rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-gold" />
            <span className="text-gold-muted text-[10px] tracking-[1px]">REPARTIDORES</span>
          </div>
          <p className="text-white text-xl font-semibold">{summary?.driversWithDebt ?? 0}</p>
        </div>
        <div className="bg-tonalli-black-card border border-subtle rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={14} className="text-gold" />
            <span className="text-gold-muted text-[10px] tracking-[1px]">ORDENES</span>
          </div>
          <p className="text-white text-xl font-semibold">{summary?.pendingOrders ?? 0}</p>
        </div>
      </div>

      {/* Driver list */}
      {!debts || debts.length === 0 ? (
        <div className="text-center py-16">
          <Receipt size={40} className="text-silver-dark mx-auto mb-3" />
          <p className="text-silver-muted text-sm">No hay deudas pendientes</p>
          <p className="text-silver-dark text-xs mt-1">Las deudas aparecen cuando repartidores recogen pedidos sin pago previo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map((driver) => {
            const tier = TIER_STYLES[driver.trustTier] ?? TIER_STYLES.new;
            const isExpanded = expanded === driver.driverName;

            return (
              <div key={driver.driverName} className="bg-tonalli-black-card border border-subtle rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-tonalli-black-soft transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : driver.driverName)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <span className="text-orange-400 text-sm font-bold">
                        {driver.driverName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium">{driver.driverName}</p>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${tier.cls}`}>
                          {tier.label}
                        </span>
                      </div>
                      {driver.driverPhone && (
                        <p className="text-silver-dark text-[11px]">{driver.driverPhone}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-orange-400 text-sm font-semibold">${driver.totalDebt.toFixed(2)}</p>
                      <p className="text-silver-dark text-[10px]">{driver.orders.length} orden(es)</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-silver-dark" /> : <ChevronDown size={16} className="text-silver-dark" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-subtle">
                    <div className="p-3 space-y-2">
                      {driver.orders.map((order) => (
                        <div key={order.orderId} className="flex items-center justify-between px-3 py-2 bg-tonalli-black rounded-lg">
                          <div>
                            <p className="text-silver text-sm">Pedido #{String(order.orderNumber).padStart(3, '0')}</p>
                            <p className="text-silver-dark text-[10px]">
                              {new Date(order.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <p className="text-white text-sm font-medium">${order.foodAmount.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-subtle">
                      <button
                        onClick={(e) => { e.stopPropagation(); openConfirm(driver); }}
                        className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                      >
                        Confirmar Pago
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm payment modal */}
      {showConfirm && selectedDriver && (
        <Modal title="Confirmar Pago de Deuda" onClose={() => setShowConfirm(false)}>
          <div className="space-y-4">
            <div className="bg-tonalli-black rounded-xl p-3">
              <p className="text-silver-muted text-[10px] tracking-[1px] mb-1">REPARTIDOR</p>
              <p className="text-white text-sm font-medium">{selectedDriver.driverName}</p>
              <p className="text-silver-dark text-xs">Deuda total: ${selectedDriver.totalDebt.toFixed(2)}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">MONTO A CONFIRMAR</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                step="0.01"
                min="0"
                className="w-full bg-tonalli-black border border-light-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">METODO DE PAGO</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPayMethod('cash')}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    payMethod === 'cash'
                      ? 'bg-gold/20 text-gold border border-gold/30'
                      : 'bg-tonalli-black border border-light-border text-silver-muted hover:text-white'
                  }`}
                >
                  Efectivo
                </button>
                <button
                  onClick={() => setPayMethod('transfer')}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    payMethod === 'transfer'
                      ? 'bg-gold/20 text-gold border border-gold/30'
                      : 'bg-tonalli-black border border-light-border text-silver-muted hover:text-white'
                  }`}
                >
                  Transferencia
                </button>
              </div>
            </div>

            <GoldButton
              loading={confirmMut.isPending}
              disabled={!payAmount || parseFloat(payAmount) <= 0}
              onClick={handleConfirm}
            >
              Confirmar Pago
            </GoldButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
