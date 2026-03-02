import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Check, Flame, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { Order, OrderStatus, OrdersResponse } from '@/types';
import { useNotificationSound } from '@/hooks/useNotificationSound';

function KitchenTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(createdAt).getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins}:${String(secs).padStart(2, '0')}`);
      setIsUrgent(mins >= 15);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold tabular-nums ${isUrgent ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-tonalli-black-soft text-silver-muted'}`}>
      {isUrgent ? <Flame size={12} /> : <Clock size={12} />}
      {elapsed}
    </div>
  );
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'confirmed' | 'preparing'>('confirmed');
  const playSound = useNotificationSound();
  const prevCountRef = useRef<number>(0);

  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-orders', tab],
    queryFn: () => apiFetch<OrdersResponse>(`/orders?status=${tab}&limit=50`, { auth: true }),
    refetchInterval: 8000,
  });

  const updateOrder = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: { status }, auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }); queryClient.invalidateQueries({ queryKey: ['orders'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: ({ orderId, itemId, status }: { orderId: string; itemId: string; status: string }) =>
      apiFetch(`/orders/${orderId}/items/${itemId}/status`, { method: 'PATCH', body: { status }, auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }); queryClient.invalidateQueries({ queryKey: ['orders'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Play sound when new orders arrive
  useEffect(() => {
    const count = data?.orders?.length ?? 0;
    if (count > prevCountRef.current && prevCountRef.current > 0) {
      playSound();
      toast.info('Nuevo pedido en cocina');
    }
    prevCountRef.current = count;
  }, [data?.orders?.length, playSound]);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-white text-xl font-light tracking-wide flex-1">Cocina</h2>
        <div className="px-2.5 py-1 rounded-lg bg-jade-glow">
          <span className="text-jade-bright text-sm font-bold">{data?.orders?.length ?? 0}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {([['confirmed', 'Por Preparar'], ['preparing', 'En Preparación']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${tab === k ? 'bg-gold text-tonalli-black' : 'bg-tonalli-black-card text-silver-dark'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
      ) : (data?.orders?.length ?? 0) === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">👨‍🍳</p>
          <p className="text-silver-muted">{tab === 'confirmed' ? 'Sin pedidos por preparar' : 'Nada en preparación'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data!.orders.map(order => {
            const isPreparing = order.status === 'preparing';
            return (
              <div key={order.id} className={`bg-tonalli-black-card border border-subtle rounded-2xl p-4 border-l-4 ${isPreparing ? 'border-l-gold-light' : 'border-l-gold'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-white text-xl font-semibold">#{String(order.orderNumber).padStart(3, '0')}</span>
                    <span className="px-2.5 py-1 rounded-lg border border-jade/25 bg-table-jade text-jade-light text-xs font-medium">
                      {order.table ? `Mesa ${order.table.number}` : order.orderType === 'takeout' ? 'Para Llevar' : order.orderType === 'delivery' ? 'Domicilio' : 'Mostrador'}
                    </span>
                  </div>
                  <KitchenTimer createdAt={order.createdAt} />
                </div>

                {order.notes && (
                  <div className="bg-tonalli-black-soft rounded-lg px-2.5 py-2 mb-3">
                    <p className="text-silver-muted text-xs">📝 {order.notes}</p>
                  </div>
                )}

                <div className="space-y-1.5 mb-3">
                  {order.items.map(item => {
                    const done = item.status === 'ready' || item.status === 'delivered';
                    return (
                      <button
                        key={item.id}
                        disabled={done || !isPreparing}
                        onClick={() => !done && isPreparing && updateItem.mutate({ orderId: order.id, itemId: item.id, status: 'ready' })}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg bg-tonalli-black-soft text-left ${done ? 'opacity-40' : isPreparing ? 'hover:bg-tonalli-black-elevated cursor-pointer' : ''}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${done ? 'bg-jade border-jade' : 'border-silver-dark'}`}>
                          {done && <Check size={12} className="text-tonalli-black" />}
                        </div>
                        <span className={`text-gold text-base font-bold min-w-[28px] ${done ? 'line-through text-silver-dark' : ''}`}>{item.quantity}x</span>
                        <span className={`text-white text-[15px] font-medium flex-1 ${done ? 'line-through text-silver-dark' : ''}`}>{item.product.name}</span>
                        {item.notes && <span className="text-silver-dark text-[11px] italic max-w-[100px] truncate">{item.notes}</span>}
                      </button>
                    );
                  })}
                </div>

                {order.status === 'confirmed' && (
                  <button
                    onClick={() => updateOrder.mutate({ orderId: order.id, status: 'preparing' })}
                    className="w-full py-3.5 rounded-xl bg-gold text-tonalli-black text-[15px] font-semibold hover:bg-gold-light transition-colors"
                  >
                    Empezar a Preparar
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrder.mutate({ orderId: order.id, status: 'ready' })}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-jade text-white text-base font-bold tracking-[2px] hover:bg-jade-light transition-colors"
                  >
                    <Check size={18} />
                    LISTO
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
