import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Bell, Receipt, Plus, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { useSocket } from '@/context/SocketContext';
import { useClientOrder, useRequestBill, useCallWaiter } from '@/hooks/useOrders';
import OrderTimeline from '@/components/ui/OrderTimeline';
import LiveActivityFeed from '@/components/ui/LiveActivityFeed';

const ITEM_STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: 'Pendiente', color: 'text-gold-muted' },
  preparing: { text: 'Preparando', color: 'text-silver' },
  ready: { text: 'Listo', color: 'text-jade-light' },
  delivered: { text: 'Entregado', color: 'text-jade' },
};

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { slug, mesa, setActiveOrderId } = useCart();
  const { isConnected, liveEvents } = useSocket();
  const { data: order, isLoading } = useClientOrder(id ?? null);
  const requestBill = useRequestBill();
  const callWaiter = useCallWaiter();

  useEffect(() => {
    if (id) setActiveOrderId(id);
  }, [id, setActiveOrderId]);

  const handleRequestBill = () => {
    requestBill.mutate(
      { slug, tableNumber: mesa },
      {
        onSuccess: (res) => toast.success(res.message),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const handleCallWaiter = () => {
    callWaiter.mutate(
      { slug, tableNumber: mesa },
      {
        onSuccess: (res) => toast.success(res.message),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tonalli-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-tonalli-black flex flex-col items-center justify-center p-6">
        <p className="text-white font-medium mb-2">Pedido no encontrado</p>
        <p className="text-silver-muted text-sm mb-4">Puede que haya expirado o el enlace sea incorrecto.</p>
        <button
          onClick={() => navigate(`/${slug}?mesa=${mesa}`)}
          className="px-6 py-3 rounded-xl border border-gold text-gold text-sm font-medium"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const orderNum = `#${String(order.orderNumber).padStart(3, '0')}`;
  const isFinished = order.status === 'paid' || order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-tonalli-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(`/${slug}?mesa=${mesa}`)} className="text-silver-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-base font-medium flex-1">Seguimiento</h1>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-jade animate-pulse' : 'bg-red-400'}`} />
          <span className="text-[10px] text-silver-dark">{isConnected ? 'En vivo' : 'Reconectando...'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Order number */}
        <div className="text-center mt-4 mb-6">
          <p className="text-silver-muted text-xs uppercase tracking-[2px] mb-1">Pedido</p>
          <p className="text-gold text-4xl font-display font-light">{orderNum}</p>
          {mesa > 0 && <p className="text-silver-dark text-xs mt-1">Mesa {order.tableNumber}</p>}
        </div>

        {/* Timeline */}
        <div className="bg-tonalli-black-card border border-light-border rounded-xl p-4 mb-4">
          <OrderTimeline status={order.status} />
          {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing') && (
            <div className="mt-3 pt-3 border-t border-light-border text-center">
              <p className="text-silver-muted text-xs">Tiempo estimado de preparación</p>
              <p className="text-gold text-lg font-semibold">~{Math.max(10, order.items.length * 5)} min</p>
            </div>
          )}
          {order.status === 'ready' && (
            <div className="mt-3 pt-3 border-t border-light-border text-center">
              <p className="text-jade text-sm font-semibold">Tu pedido está listo</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="mb-4">
          <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-2">PRODUCTOS</p>
          <div className="flex flex-col gap-2">
            {order.items.map(item => {
              const statusInfo = ITEM_STATUS_LABEL[item.status] ?? ITEM_STATUS_LABEL.pending;
              return (
                <div key={item.id} className="flex items-center justify-between bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      {item.quantity}x {item.product.name}
                    </p>
                    {item.notes && <p className="text-silver-dark text-xs mt-0.5">{item.notes}</p>}
                  </div>
                  <span className={`text-xs font-medium ${statusInfo.color} shrink-0 ml-3`}>
                    {statusInfo.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Activity */}
        {!isFinished && liveEvents.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio size={12} className="text-gold" />
              <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">ACTIVIDAD EN VIVO</p>
            </div>
            <div className="bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3">
              <LiveActivityFeed events={liveEvents} />
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center pt-3 border-t border-light-border mb-6">
          <span className="text-silver-muted text-sm">Total</span>
          <span className="text-gold text-lg font-bold">${Number(order.total).toFixed(2)}</span>
        </div>

        {/* Actions */}
        {!isFinished && (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleRequestBill}
              disabled={requestBill.isPending || order.status === 'pending'}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-gold/30 text-gold text-sm font-medium hover:bg-gold/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Receipt size={16} />
              {requestBill.isPending ? 'Solicitando...' : 'Pedir Cuenta'}
            </button>

            <button
              onClick={handleCallWaiter}
              disabled={callWaiter.isPending}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-silver/20 text-silver text-sm font-medium hover:bg-silver/5 transition-colors disabled:opacity-40"
            >
              <Bell size={16} />
              {callWaiter.isPending ? 'Llamando...' : 'Llamar Mesero'}
            </button>

            <button
              onClick={() => navigate(`/${slug}/menu?mesa=${mesa}`)}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-jade/20 text-jade-light text-sm font-medium hover:bg-jade/10 transition-colors"
            >
              <Plus size={16} />
              Ordenar Más
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
