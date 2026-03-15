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
  Phone,
  ShieldCheck,
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
      className={`w-full flex items-center gap-2.5 px-3 py-3 md:py-2.5 rounded-lg text-left transition-colors ${
        done
          ? 'opacity-40'
          : canToggle
            ? 'hover:bg-tonalli-black-elevated active:bg-tonalli-black-elevated cursor-pointer'
            : ''
      }`}
    >
      <div
        className={`w-6 h-6 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          done ? 'bg-jade border-jade' : 'border-silver-dark'
        }`}
      >
        {done && <Check size={12} className="text-tonalli-black" />}
      </div>
      <span
        className={`text-gold text-[15px] md:text-sm font-bold min-w-[24px] ${done ? 'line-through text-silver-dark' : ''}`}
      >
        {item.quantity}x
      </span>
      <span
        className={`text-white text-[15px] md:text-sm font-medium flex-1 ${done ? 'line-through text-silver-dark' : ''}`}
      >
        {item.product.name}
      </span>
      {item.notes && (
        <span className="px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-300 text-[11px] font-semibold max-w-[160px] truncate">
          ⚠ {item.notes}
        </span>
      )}
    </button>
  );
}

// ─── KitchenOrderCard ────────────────────────────────────

// ─── DeliveryPickupVerification ─────────────────────────

function DeliveryPickupVerification({
  order,
  onConfirmPickup,
  isConfirming,
}: {
  order: Order;
  onConfirmPickup: (orderId: string, code: string) => void;
  isConfirming: boolean;
}) {
  const [code, setCode] = useState('');
  const meta = order.deliveryMeta;

  if (meta?.pickupConfirmed) {
    return (
      <div className="bg-jade/10 border border-jade/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
        <ShieldCheck size={16} className="text-jade shrink-0" />
        <span className="text-jade-light text-sm font-medium">Entregado a repartidor</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Driver info card */}
      <div className="bg-orange-500/10 border border-orange-400/20 rounded-xl px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <Bike size={14} className="text-orange-300" />
          <span className="text-orange-200 text-sm font-semibold">{meta?.driverName ?? 'Repartidor'}</span>
          {meta?.driverVehicle && (
            <span className="text-orange-300/60 text-xs">({meta.driverVehicle})</span>
          )}
        </div>
        {meta?.driverPhone && (
          <div className="flex items-center gap-1.5">
            <Phone size={11} className="text-orange-300/60" />
            <span className="text-orange-200/80 text-xs">{meta.driverPhone}</span>
          </div>
        )}
        {meta?.driverCode && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-orange-300/60 text-[10px] uppercase tracking-wider">Código esperado:</span>
            <span className="text-orange-100 text-lg font-bold tracking-[4px] font-mono">{meta.driverCode}</span>
          </div>
        )}
      </div>

      {/* Code input + confirm button */}
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={10}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Código"
          className="flex-1 px-3 py-2.5 bg-tonalli-black-soft border border-subtle rounded-xl text-white text-center text-lg font-bold tracking-[4px] font-mono uppercase placeholder:text-silver-dark placeholder:text-sm placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:border-orange-400/50"
        />
        <button
          onClick={() => code.trim() && onConfirmPickup(order.id, code.trim())}
          disabled={!code.trim() || isConfirming}
          className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {isConfirming ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          Confirmar
        </button>
      </div>
      {(meta?.pickupAttempts ?? 0) > 0 && (
        <p className="text-red-400 text-[11px] text-center">
          {3 - (meta?.pickupAttempts ?? 0)} intento(s) restante(s)
        </p>
      )}
    </div>
  );
}

// ─── KitchenOrderCard ────────────────────────────────────

function KitchenOrderCard({
  order,
  column,
  isNew,
  onAction,
  onItemToggle,
  onConfirmPickup,
  isConfirming,
}: {
  order: Order;
  column: 'new' | 'preparing' | 'ready';
  isNew: boolean;
  onAction: (orderId: string, status: OrderStatus) => void;
  onItemToggle: (orderId: string, itemId: string, status: string) => void;
  onConfirmPickup: (orderId: string, code: string) => void;
  isConfirming: boolean;
}) {
  const groups = useMemo(() => groupItemsByCategory(order.items), [order.items]);
  const readyCount = order.items.filter((i) => i.status === 'ready' || i.status === 'delivered').length;
  const totalCount = order.items.length;
  const progress = totalCount > 0 ? (readyCount / totalCount) * 100 : 0;
  const isDelivery = order.orderType === 'delivery' && order.source === 'yesswera';

  const borderColors = {
    new: 'border-l-gold',
    preparing: 'border-l-silver',
    ready: 'border-l-jade',
  };

  return (
    <div
      className={`bg-tonalli-black-card border border-subtle rounded-xl p-4 md:p-3.5 border-l-4 ${borderColors[column]} ${
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

      {/* Delivery info (non-ready columns) */}
      {order.orderType === 'delivery' && order.deliveryMeta?.driverName && column !== 'ready' && (
        <div className="bg-orange-500/10 rounded-lg px-2.5 py-1.5 mb-2.5 flex items-center gap-1.5">
          <Bike size={12} className="text-orange-300 shrink-0" />
          <span className="text-orange-200 text-xs font-medium truncate">
            {order.deliveryMeta.driverName}
            {order.deliveryMeta.estimatedMinutes != null && ` · ~${order.deliveryMeta.estimatedMinutes} min`}
          </span>
        </div>
      )}

      {/* Notes — prominent for kitchen staff */}
      {order.notes && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 mb-2.5 flex items-start gap-2">
          <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-sm font-semibold">{order.notes}</p>
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
          className="w-full py-4 md:py-3 rounded-xl bg-gold text-tonalli-black text-base md:text-sm font-bold uppercase tracking-wider hover:bg-gold-light active:bg-gold-light transition-colors"
        >
          Preparar
        </button>
      )}
      {column === 'preparing' && (
        <button
          onClick={() => onAction(order.id, 'ready')}
          className="w-full flex items-center justify-center gap-2 py-4 md:py-3 rounded-xl bg-jade text-white text-base md:text-sm font-bold uppercase tracking-[2px] hover:bg-jade-light active:bg-jade-light transition-colors"
        >
          <Check size={18} className="md:w-4 md:h-4" />
          Listo
        </button>
      )}
      {column === 'ready' && isDelivery && (
        <DeliveryPickupVerification order={order} onConfirmPickup={onConfirmPickup} isConfirming={isConfirming} />
      )}
      {column === 'ready' && !isDelivery && (
        <button
          onClick={() => onAction(order.id, 'delivered')}
          className="w-full flex items-center justify-center gap-2 py-4 md:py-3 rounded-xl bg-tonalli-black-elevated border border-jade/30 text-jade-light text-base md:text-sm font-bold uppercase tracking-wider hover:bg-jade/10 active:bg-jade/10 transition-colors"
        >
          <Check size={18} className="md:w-4 md:h-4" />
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
  onConfirmPickup,
  isConfirming,
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
  onConfirmPickup: (orderId: string, code: string) => void;
  isConfirming: boolean;
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
              onConfirmPickup={onConfirmPickup}
              isConfirming={isConfirming}
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
  avgPrepMinutes,
}: {
  counts: { new: number; preparing: number; ready: number };
  isConnected: boolean;
  onTestSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  avgPrepMinutes: number | null;
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

      {/* Avg prep time */}
      {avgPrepMinutes != null && (
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-tonalli-black-soft">
          <Clock size={12} className="text-silver-muted" />
          <span className="text-silver text-xs font-medium">~{avgPrepMinutes} min</span>
        </div>
      )}

      {/* Clock */}
      <span className="text-silver-muted text-sm font-mono tabular-nums">{clock}</span>

      {/* Connection status */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
        isConnected ? 'bg-jade/10' : 'bg-red-500/15 animate-pulse'
      }`}>
        {isConnected ? (
          <Wifi size={14} className="text-jade" />
        ) : (
          <WifiOff size={14} className="text-red-400" />
        )}
        <span className={`text-xs font-medium ${isConnected ? 'text-jade' : 'text-red-400'}`}>
          {isConnected ? 'En vivo' : 'Sin señal'}
        </span>
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

  // Prep time stats
  const { data: prepTimeData } = useQuery({
    queryKey: ['prep-time-stats'],
    queryFn: () => apiFetch<{ globalAvgMinutes: number | null }>('/reports/prep-time', { auth: true }).catch(() => null),
    refetchInterval: 300000, // every 5 min
    staleTime: 300000,
  });

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
        setTimeout(() => setNewOrderIds(new Set()), 1000);
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

  const confirmPickup = useMutation({
    mutationFn: ({ orderId, driverCode }: { orderId: string; driverCode: string }) =>
      apiFetch<{ confirmed: boolean; message: string }>(`/delivery/orders/${orderId}/confirm-pickup`, { method: 'POST', body: { driverCode }, auth: true }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(data.message);
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

  const handleConfirmPickup = useCallback(
    (orderId: string, code: string) => confirmPickup.mutate({ orderId, driverCode: code }),
    [confirmPickup],
  );

  const [mobileTab, setMobileTab] = useState<'new' | 'preparing' | 'ready'>('new');

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
        avgPrepMinutes={prepTimeData?.globalAvgMinutes ?? null}
      />

      {!isConnected && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-2.5 flex items-center justify-center gap-2 animate-pulse">
          <WifiOff size={16} className="text-red-400" />
          <span className="text-red-300 text-sm font-medium">Conexión perdida — los pedidos nuevos no llegarán en tiempo real</span>
        </div>
      )}

      {/* Mobile tabs — visible only on phones */}
      <div className="flex md:hidden border-b border-subtle">
        {([
          { key: 'new' as const, label: 'Nuevas', color: 'text-gold border-gold', count: counts.new },
          { key: 'preparing' as const, label: 'Preparando', color: 'text-silver border-silver', count: counts.preparing },
          { key: 'ready' as const, label: 'Listas', color: 'text-jade border-jade', count: counts.ready },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setMobileTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === t.key ? t.color : 'text-silver-dark border-transparent'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                mobileTab === t.key ? 'bg-current/15' : 'bg-tonalli-black-soft'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 p-2 min-h-0 overflow-hidden">
        <div className={`${mobileTab === 'new' ? '' : 'hidden md:flex'} flex-col`}>
          <KitchenColumn
            title="Nuevas"
            color="gold"
            count={counts.new}
            orders={confirmedOrders}
            column="new"
            newOrderIds={newOrderIds}
            onAction={handleAction}
            onItemToggle={handleItemToggle}
            onConfirmPickup={handleConfirmPickup}
            isConfirming={confirmPickup.isPending}
            isLoading={confirmedQuery.isLoading}
          />
        </div>
        <div className={`${mobileTab === 'preparing' ? '' : 'hidden md:flex'} flex-col`}>
          <KitchenColumn
            title="En Preparaci&#xF3;n"
            color="silver"
            count={counts.preparing}
            orders={preparingOrders}
            column="preparing"
            newOrderIds={newOrderIds}
            onAction={handleAction}
            onItemToggle={handleItemToggle}
            onConfirmPickup={handleConfirmPickup}
            isConfirming={confirmPickup.isPending}
            isLoading={preparingQuery.isLoading}
          />
        </div>
        <div className={`${mobileTab === 'ready' ? '' : 'hidden md:flex'} flex-col`}>
          <KitchenColumn
            title="Listas"
            color="jade"
            count={counts.ready}
            orders={readyOrders}
            column="ready"
            newOrderIds={newOrderIds}
            onAction={handleAction}
            onItemToggle={handleItemToggle}
            onConfirmPickup={handleConfirmPickup}
            isConfirming={confirmPickup.isPending}
            isLoading={readyQuery.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
