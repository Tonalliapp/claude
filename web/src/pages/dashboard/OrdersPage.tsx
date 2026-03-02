import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, ChevronRight, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { Order, OrderStatus, OrdersResponse } from '@/types';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const TABS = [
  { key: 'pending', label: 'Pendientes', status: 'pending' },
  { key: 'preparing', label: 'Preparando', status: 'preparing' },
  { key: 'ready', label: 'Listos', status: 'ready' },
  { key: 'all', label: 'Todos', status: undefined },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: 'paid',
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirmar',
  confirmed: 'Preparar',
  preparing: 'Listo',
  ready: 'Entregar',
  delivered: 'Cobrar',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-l-gold',
  confirmed: 'border-l-gold-light',
  preparing: 'border-l-silver',
  ready: 'border-l-jade',
  delivered: 'border-l-jade-bright',
  paid: 'border-l-silver-dark',
  cancelled: 'border-l-red-500',
};

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-status-pending', text: 'text-gold', label: 'Pendiente' },
  confirmed: { bg: 'bg-status-pending', text: 'text-gold-light', label: 'Confirmado' },
  preparing: { bg: 'bg-status-preparing', text: 'text-silver', label: 'Preparando' },
  ready: { bg: 'bg-status-ready', text: 'text-jade', label: 'Listo' },
  delivered: { bg: 'bg-jade-glow', text: 'text-jade-bright', label: 'Entregado' },
  paid: { bg: 'bg-status-preparing', text: 'text-silver-dark', label: 'Pagado' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const statusParam = TABS.find(t => t.key === activeTab)?.status;
  const queryStr = statusParam ? `?status=${statusParam}&limit=50` : '?limit=50';

  const { data, isLoading } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () => apiFetch<OrdersResponse>(`/orders${queryStr}`, { auth: true }),
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: { status }, auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelOrder = useMutation({
    mutationFn: (orderId: string) =>
      apiFetch(`/orders/${orderId}/cancel`, { method: 'POST', body: { reason: 'Cancelado por staff' }, auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); setCancelId(null); toast.success('Pedido cancelado'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const getTimeAgo = useCallback((createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-white text-2xl font-light tracking-wide">Pedidos</h2>
        {data && <span className="text-silver-muted text-sm">{data.total} total</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-gold text-tonalli-black'
                : 'bg-tonalli-black-card text-silver-dark hover:text-silver'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-gold animate-spin" />
        </div>
      ) : (data?.orders?.length ?? 0) === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-silver-muted text-sm">Sin pedidos en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data!.orders.map(order => {
            const badge = STATUS_BADGES[order.status] ?? STATUS_BADGES.pending;
            const nextLabel = NEXT_LABEL[order.status];
            return (
              <div
                key={order.id}
                className={`bg-tonalli-black-card border border-subtle rounded-2xl p-4 border-l-[3px] ${STATUS_COLORS[order.status] ?? ''}`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-[17px] font-semibold">
                      #{String(order.orderNumber).padStart(3, '0')}
                    </span>
                    <span className="px-2 py-0.5 rounded-md border border-jade/25 bg-table-jade text-jade-light text-[10px] font-medium">
                      {order.table ? `Mesa ${order.table.number}` : order.orderType === 'takeout' ? 'Para Llevar' : order.orderType === 'delivery' ? 'Domicilio' : 'Mostrador'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-silver-dark">
                      <Clock size={12} />
                      <span className="text-[11px]">{getTimeAgo(order.createdAt)}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="space-y-1 mb-3">
                  {order.items.slice(0, 3).map(item => (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <span className="text-gold text-xs font-semibold min-w-[22px]">{item.quantity}x</span>
                      <span className="text-silver text-[13px] truncate flex-1">{item.product.name}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-silver-muted text-[11px]">+{order.items.length - 3} más</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center border-t border-light-border pt-3">
                  <span className="text-gold text-base font-semibold">${order.total.toFixed(2)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetailOrder(order)}
                      className="p-1.5 rounded-lg text-silver-dark hover:text-silver hover:bg-tonalli-black-soft transition-colors"
                      aria-label="Ver detalle"
                    >
                      <Eye size={16} />
                    </button>
                    {order.status !== 'paid' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => setCancelId(order.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    {nextLabel && (
                      <button
                        onClick={() => updateStatus.mutate({ orderId: order.id, status: NEXT_STATUS[order.status]! })}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-gold text-tonalli-black text-xs font-semibold hover:bg-gold-light transition-colors"
                      >
                        {nextLabel}
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {detailOrder && (
        <Modal title={`Pedido #${String(detailOrder.orderNumber).padStart(3, '0')}`} onClose={() => setDetailOrder(null)}>
          <div className="flex justify-between items-center">
            <span className="text-silver-muted text-xs">{detailOrder.table ? `Mesa ${detailOrder.table.number}` : detailOrder.orderType === 'takeout' ? 'Para Llevar' : detailOrder.orderType === 'delivery' ? 'Domicilio' : 'Mostrador'}</span>
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${STATUS_BADGES[detailOrder.status]?.bg} ${STATUS_BADGES[detailOrder.status]?.text}`}>
              {STATUS_BADGES[detailOrder.status]?.label}
            </span>
          </div>
          <div className="flex justify-between text-silver-dark text-xs">
            <span>Creado: {new Date(detailOrder.createdAt).toLocaleString('es-MX')}</span>
            {detailOrder.user && <span>Atendió: {detailOrder.user.name}</span>}
          </div>

          <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mt-1">PRODUCTOS</p>
          <div className="space-y-2">
            {detailOrder.items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-tonalli-black-soft rounded-lg p-2.5">
                <span className="text-gold text-sm font-bold min-w-[28px]">{item.quantity}x</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                  {item.notes && <p className="text-silver-dark text-xs italic">{item.notes}</p>}
                </div>
                <span className="text-silver text-sm">${(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {detailOrder.notes && (
            <div className="bg-tonalli-black-soft rounded-lg px-3 py-2">
              <p className="text-silver-muted text-xs">📝 {detailOrder.notes}</p>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-light-border pt-3">
            <span className="text-silver-muted text-sm">Total</span>
            <span className="text-gold text-xl font-semibold">${detailOrder.total.toFixed(2)}</span>
          </div>
        </Modal>
      )}

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={!!cancelId}
        title="Cancelar Pedido"
        message="¿Estás seguro de cancelar este pedido? Se notificará al cliente."
        confirmLabel="Cancelar pedido"
        onConfirm={() => cancelId && cancelOrder.mutate(cancelId)}
        onCancel={() => setCancelId(null)}
        loading={cancelOrder.isPending}
      />
    </div>
  );
}
