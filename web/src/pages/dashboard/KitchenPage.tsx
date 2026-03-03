import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Check,
  Flame,
  Loader2,
  Wifi,
  WifiOff,
  Volume2,
  Maximize,
  Minimize,
  AlertTriangle,
  ChefHat,
  Bike,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { Order, OrderItem, OrderStatus, OrdersResponse } from '@/types';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useSocket } from '@/socket/SocketProvider';

// ─── Helpers ─────────────────────────────────────────────

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Mesa',
  takeout: 'P/Llevar',
  counter: 'Mostrador',
  delivery: 'Domicilio',
};

function formatOrderNumber(n: number) {
  return `#${String(n).padStart(3, '0')}`;
}

function getOrderTypeLabel(order: Order) {
  if (order.table) return `Mesa ${order.table.number}`;
  return ORDER_TYPE_LABELS[order.orderType ?? 'counter'] ?? 'Mostrador';
}

function groupItemsByCategory(items: OrderItem[]) {
  const groups: Map<string, { name: string; items: OrderItem[] }> = new Map();
  for (const item of items) {
    const catId = item.product.category?.id ?? '_none';
    const catName = item.product.category?.name ?? 'Otros';
    if (!groups.has(catId)) groups.set(catId, { name: catName, items: [] });
    groups.get(catId)!.items.push(item);
  }
  return Array.from(groups.values());
}

// ─── KitchenTimer ────────────────────────────────────────

type TimerLevel = 'normal' | 'warning' | 'late' | 'urgent';

function KitchenTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState('');
  const [level, setLevel] = useState<TimerLevel>('normal');

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(createdAt).getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins}:${String(secs).padStart(2, '0')}`);
      if (mins >= 20) setLevel('urgent');
      else if (mins >= 15) setLevel('late');
      else if (mins >= 10) setLevel('warning');
      else setLevel('normal');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const styles: Record<TimerLevel, string> = {
    normal: 'bg-tonalli-black-soft text-silver-muted',
    warning: 'bg-gold/10 text-gold-light',
    late: 'bg-red-500/10 text-red-400',
    urgent: 'bg-red-500/15 text-red-400 animate-pulse',
  };

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold tabular-nums ${styles[level]}`}>
      {level === 'urgent' || level === 'late' ? <Flame size={13} /> : <Clock size={13} />}
      {elapsed}
    </div>
  );
}

// ─── KitchenItemRow ──────────────────────────────────────

function KitchenItemRow({
  item,
  canToggle,
  onToggle,
}: {
  item: OrderItem;
  canToggle: boolean;
  onToggle: () => void;
}) {
  const done = item.status === 'ready' || item.status === 'delivered';

  return (
    <button
      disabled={!canToggle || done}
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
        done
          ? 'opacity-40'
          : canToggle
            ? 'hover:bg-tonalli-black-elevated cursor-pointer'
            : ''
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          done ? 'bg-jade border-jade' : 'border-silver-dark'
        }`}
      >
        {done && <Check size={11} className="text-tonalli-black" />}
      </div>
      <span
        className={`text-gold text-sm font-bold min-w-[24px] ${done ? 'line-through text-silver-dark' : ''}`}
      >
        {item.quantity}x
      </span>
      <span
        className={`text-white text-sm font-medium flex-1 ${done ? 'line-through text-silver-dark' : ''}`}
      >
        {item.product.name}
      </span>
      {item.notes && (
        <span className="px-1.5 py-0.5 rounded bg-gold/15 text-gold text-[10px] font-medium max-w-[120px] truncate">
          {item.notes}
        </span>
      )}
    </button>
  );
}

// ─── KitchenOrderCard ────────────────────────────────────

function KitchenOrderCard({
  order,
  column,
  isNew,
  onAction,
  onItemToggle,
}: {
  order: Order;
  column: 'new' | 'preparing' | 'ready';
  isNew: boolean;
  onAction: (orderId: string, status: OrderStatus) => void;
  onItemToggle: (orderId: string, itemId: string, status: string) => void;
}) {
  const groups = useMemo(() => groupItemsByCategory(order.items), [order.items]);
  const readyCount = order.items.filter((i) => i.status === 'ready' || i.status === 'delivered').length;
  const totalCount = order.items.length;
  const progress = totalCount > 0 ? (readyCount / totalCount) * 100 : 0;

  const borderColors = {
    new: 'border-l-gold',
    preparing: 'border-l-silver',
    ready: 'border-l-jade',
  };

  return (
    <div
      className={`bg-tonalli-black-card border border-subtle rounded-xl p-3.5 border-l-4 ${borderColors[column]} ${
        isNew ? 'animate-pulse-once' : ''
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg font-bold">{formatOrderNumber(order.orderNumber)}</span>
          {order.orderType === 'delivery' ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-orange-400/30 bg-orange-500/15 text-orange-300 text-xs font-medium">
              <Bike size={12} />
              Domicilio
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md border border-white/10 bg-tonalli-black-soft text-silver-light text-xs font-medium">
              {getOrderTypeLabel(order)}
            </span>
          )}
        </div>
        <KitchenTimer createdAt={order.createdAt} />
      </div>

      {/* Delivery info */}
      {order.orderType === 'delivery' && order.deliveryMeta?.driverName && (
        <div className="bg-orange-500/10 rounded-lg px-2.5 py-1.5 mb-2.5 flex items-center gap-1.5">
          <Bike size={12} className="text-orange-300 shrink-0" />
          <span className="text-orange-200 text-xs font-medium truncate">
            {order.deliveryMeta.driverName}
            {order.deliveryMeta.estimatedMinutes != null && ` · ~${order.deliveryMeta.estimatedMinutes} min`}
          </span>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-tonalli-black-soft rounded-lg px-2.5 py-1.5 mb-2.5 flex items-start gap-1.5">
          <AlertTriangle size={12} className="text-gold mt-0.5 shrink-0" />
          <p className="text-silver-muted text-xs">{order.notes}</p>
        </div>
      )}

      {/* Items grouped by category */}
      <div className="space-y-2 mb-3">
        {groups.map((group) => (
          <div key={group.name}>
            {groups.length > 1 && (
              <p className="text-silver-dark text-[10px] font-semibold uppercase tracking-wider mb-1 px-1">
                {group.name}
              </p>
            )}
            <div className="space-y-0.5 bg-tonalli-black-soft rounded-lg">
              {group.items.map((item) => (
                <KitchenItemRow
                  key={item.id}
                  item={item}
                  canToggle={column === 'preparing'}
                  onToggle={() => onItemToggle(order.id, item.id, 'ready')}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar (only in preparing) */}
      {column === 'preparing' && (
        <div className="h-1 bg-tonalli-black-soft rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-jade rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Action button */}
      {column === 'new' && (
        <button
          onClick={() => onAction(order.id, 'preparing')}
          className="w-full py-3 rounded-xl bg-gold text-tonalli-black text-sm font-bold uppercase tracking-wider hover:bg-gold-light transition-colors"
        >
          Preparar
        </button>
      )}
      {column === 'preparing' && (
        <button
          onClick={() => onAction(order.id, 'ready')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-jade text-white text-sm font-bold uppercase tracking-[2px] hover:bg-jade-light transition-colors"
        >
          <Check size={16} />
          Listo
        </button>
      )}
      {column === 'ready' && (
        <button
          onClick={() => onAction(order.id, 'delivered')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-tonalli-black-elevated border border-jade/30 text-jade-light text-sm font-bold uppercase tracking-wider hover:bg-jade/10 transition-colors"
        >
          <Check size={16} />
          Entregado
        </button>
      )}
    </div>
  );
}

// ─── KitchenColumn ───────────────────────────────────────

function KitchenColumn({
  title,
  color,
  count,
  orders,
  column,
  newOrderIds,
  onAction,
  onItemToggle,
  isLoading,
}: {
  title: string;
  color: 'gold' | 'silver' | 'jade';
  count: number;
  orders: Order[];
  column: 'new' | 'preparing' | 'ready';
  newOrderIds: Set<string>;
  onAction: (orderId: string, status: OrderStatus) => void;
  onItemToggle: (orderId: string, itemId: string, status: string) => void;
  isLoading: boolean;
}) {
  const headerColors = {
    gold: 'border-gold bg-gold/5',
    silver: 'border-silver bg-silver/5',
    jade: 'border-jade bg-jade/5',
  };
  const badgeColors = {
    gold: 'bg-gold/15 text-gold',
    silver: 'bg-silver/15 text-silver',
    jade: 'bg-jade/15 text-jade-light',
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-t-2 ${headerColors[color]}`}>
        <h3 className="text-white text-sm font-semibold tracking-wide">{title}</h3>
        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${badgeColors[color]}`}>{count}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-tonalli-black-rich/50 rounded-b-xl min-h-[200px]">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 text-silver-muted animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-silver-dark">
            <ChefHat size={28} className="mb-2 opacity-30" />
            <p className="text-xs">Sin comandas</p>
          </div>
        ) : (
          orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              column={column}
              isNew={newOrderIds.has(order.id)}
              onAction={onAction}
              onItemToggle={onItemToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── KitchenHeader ───────────────────────────────────────

function KitchenHeader({
  counts,
  isConnected,
  onTestSound,
  isFullscreen,
  onToggleFullscreen,
}: {
  counts: { new: number; preparing: number; ready: number };
  isConnected: boolean;
  onTestSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-tonalli-black-card border-b border-subtle">
      <ChefHat size={20} className="text-gold" />
      <h1 className="text-white text-lg font-semibold tracking-wide flex-1">Cocina</h1>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-gold/15 text-gold text-xs font-bold">{counts.new}</span>
        <span className="px-2 py-0.5 rounded-md bg-silver/15 text-silver text-xs font-bold">{counts.preparing}</span>
        <span className="px-2 py-0.5 rounded-md bg-jade/15 text-jade-light text-xs font-bold">{counts.ready}</span>
      </div>

      {/* Clock */}
      <span className="text-silver-muted text-sm font-mono tabular-nums">{clock}</span>

      {/* Connection status */}
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi size={14} className="text-jade" />
        ) : (
          <WifiOff size={14} className="text-red-400" />
        )}
      </div>

      {/* Test sound */}
      <button onClick={onTestSound} className="p-1.5 rounded-lg hover:bg-tonalli-black-elevated text-silver-muted hover:text-white transition-colors">
        <Volume2 size={16} />
      </button>

      {/* Fullscreen */}
      <button onClick={onToggleFullscreen} className="p-1.5 rounded-lg hover:bg-tonalli-black-elevated text-silver-muted hover:text-white transition-colors">
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </div>
  );
}

// ─── KitchenPage (main) ──────────────────────────────────

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const playSound = useNotificationSound();
  const { isConnected } = useSocket();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  useWakeLock();

  // Track known order IDs to detect new arrivals
  const knownIdsRef = useRef<Set<string>>(new Set());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // 3 separate queries
  const confirmedQuery = useQuery({
    queryKey: ['kitchen-orders', 'confirmed'],
    queryFn: () => apiFetch<OrdersResponse>('/orders?status=confirmed&limit=50', { auth: true }),
    refetchInterval: 30000,
  });

  const preparingQuery = useQuery({
    queryKey: ['kitchen-orders', 'preparing'],
    queryFn: () => apiFetch<OrdersResponse>('/orders?status=preparing&limit=50', { auth: true }),
    refetchInterval: 30000,
  });

  const readyQuery = useQuery({
    queryKey: ['kitchen-orders', 'ready'],
    queryFn: () => apiFetch<OrdersResponse>('/orders?status=ready&limit=50', { auth: true }),
    refetchInterval: 30000,
  });

  const confirmedOrders = useMemo(
    () => [...(confirmedQuery.data?.orders ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [confirmedQuery.data],
  );
  const preparingOrders = useMemo(
    () => [...(preparingQuery.data?.orders ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [preparingQuery.data],
  );
  const readyOrders = useMemo(
    () => [...(readyQuery.data?.orders ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [readyQuery.data],
  );

  // Detect new orders in "confirmed" column
  useEffect(() => {
    const currentIds = new Set(confirmedOrders.map((o) => o.id));
    const brandNew = new Set<string>();

    // Only detect new if we've already loaded once
    if (knownIdsRef.current.size > 0) {
      for (const id of currentIds) {
        if (!knownIdsRef.current.has(id)) {
          brandNew.add(id);
        }
      }
      if (brandNew.size > 0) {
        playSound('kitchen');
        setNewOrderIds(brandNew);
        // Clear flash after animation
        setTimeout(() => setNewOrderIds(new Set()), 1200);
      }
    }

    // Update known IDs from all columns
    const allIds = new Set([
      ...confirmedOrders.map((o) => o.id),
      ...preparingOrders.map((o) => o.id),
      ...readyOrders.map((o) => o.id),
    ]);
    knownIdsRef.current = allIds;
  }, [confirmedOrders, preparingOrders, readyOrders, playSound]);

  // Mutations
  const updateOrder = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: { status }, auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: ({ orderId, itemId, status }: { orderId: string; itemId: string; status: string }) =>
      apiFetch(`/orders/${orderId}/items/${itemId}/status`, { method: 'PATCH', body: { status }, auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAction = useCallback(
    (orderId: string, status: OrderStatus) => updateOrder.mutate({ orderId, status }),
    [updateOrder],
  );

  const handleItemToggle = useCallback(
    (orderId: string, itemId: string, status: string) => updateItem.mutate({ orderId, itemId, status }),
    [updateItem],
  );

  const counts = {
    new: confirmedOrders.length,
    preparing: preparingOrders.length,
    ready: readyOrders.length,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <KitchenHeader
        counts={counts}
        isConnected={isConnected}
        onTestSound={() => playSound('kitchen')}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 p-2 min-h-0 overflow-hidden">
        <KitchenColumn
          title="Nuevas"
          color="gold"
          count={counts.new}
          orders={confirmedOrders}
          column="new"
          newOrderIds={newOrderIds}
          onAction={handleAction}
          onItemToggle={handleItemToggle}
          isLoading={confirmedQuery.isLoading}
        />
        <KitchenColumn
          title="En Preparaci\u00f3n"
          color="silver"
          count={counts.preparing}
          orders={preparingOrders}
          column="preparing"
          newOrderIds={newOrderIds}
          onAction={handleAction}
          onItemToggle={handleItemToggle}
          isLoading={preparingQuery.isLoading}
        />
        <KitchenColumn
          title="Listas"
          color="jade"
          count={counts.ready}
          orders={readyOrders}
          column="ready"
          newOrderIds={newOrderIds}
          onAction={handleAction}
          onItemToggle={handleItemToggle}
          isLoading={readyQuery.isLoading}
        />
      </div>
    </div>
  );
}
