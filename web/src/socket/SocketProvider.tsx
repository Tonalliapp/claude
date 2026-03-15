import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthProvider';
import type { Order, Table, SocketNotification } from '@/types';

const SOCKET_URL = 'wss://api.tonalli.app/staff';

interface SocketContextType {
  isConnected: boolean;
  notifications: SocketNotification[];
  unreadCount: number;
  clearNotifications: () => void;
  dismissNotification: (index: number) => void;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  clearNotifications: () => {},
  dismissNotification: () => {},
});

// ── Global notification sounds (no hook dependency, works anywhere) ──
let audioCtx: AudioContext | null = null;

function playSound(type: 'order' | 'alert' | 'urgent') {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    if (type === 'order') {
      // Ascending triple chime: notification bell feel
      const notes = [587, 740, 880]; // D5-F#5-A5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.13);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.13);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.13 + 0.3);
        osc.start(ctx.currentTime + i * 0.13);
        osc.stop(ctx.currentTime + i * 0.13 + 0.3);
      });
    } else if (type === 'urgent') {
      // Double quick beep for urgent actions (bill, waiter)
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime + i * 0.18);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.18 + 0.12);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.12);
      }
    } else {
      // Single chime for alerts
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Audio not available
  }
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<SocketNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notif: SocketNotification) => {
    setNotifications(prev => [notif, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
  }, []);

  const clearNotifications = useCallback(() => setUnreadCount(0), []);
  const dismissNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('tonalli_access_token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('order:new', (order: Order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });

      const orderNum = `#${String(order.orderNumber).padStart(3, '0')}`;
      const location = order.table ? `Mesa ${order.table.number}` : order.customerName ?? 'Mostrador';
      const itemCount = order.items?.length ?? 0;

      playSound('order');
      toast(`Nuevo Pedido ${orderNum}`, {
        description: `${location}${itemCount > 0 ? ` · ${itemCount} producto${itemCount > 1 ? 's' : ''}` : ''}`,
        duration: 8000,
        action: { label: 'Ver', onClick: () => window.location.assign('/dashboard/kitchen') },
      });

      addNotification({
        type: 'order_new',
        title: 'Nuevo Pedido',
        message: `Pedido ${orderNum} - ${location}`,
        tableNumber: order.table?.number,
        orderId: order.id,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('order:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivered-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    socket.on('order:item:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });

    socket.on('table:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('table:bill-requested', (data: { tableNumber: number; timestamp: string }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });

      playSound('urgent');
      toast.warning(`Mesa ${data.tableNumber} solicita la cuenta`, {
        duration: 10000,
        action: { label: 'Ir a POS', onClick: () => window.location.assign('/dashboard/pos') },
      });

      addNotification({
        type: 'bill_requested',
        title: 'Cuenta Solicitada',
        message: `Mesa ${data.tableNumber} solicita la cuenta`,
        tableNumber: data.tableNumber,
        timestamp: data.timestamp,
      });
    });

    socket.on('table:waiter-called', (data: { tableNumber: number; reason?: string; timestamp: string }) => {
      playSound('urgent');
      toast.warning(`Mesa ${data.tableNumber} llama al mesero`, {
        description: data.reason || undefined,
        duration: 10000,
        action: { label: 'Ir a Mesas', onClick: () => window.location.assign('/dashboard/tables') },
      });

      addNotification({
        type: 'waiter_called',
        title: 'Mesero Solicitado',
        message: `Mesa ${data.tableNumber}${data.reason ? ': ' + data.reason : ''}`,
        tableNumber: data.tableNumber,
        timestamp: data.timestamp,
      });
    });

    socket.on('inventory:alert', (data: { productName: string; currentStock: number; minStock: number }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });

      playSound('alert');
      toast.error(`Stock bajo: ${data.productName}`, {
        description: `${data.currentStock} unidades (min: ${data.minStock})`,
        duration: 6000,
      });

      addNotification({
        type: 'order_updated',
        title: 'Stock Bajo',
        message: `${data.productName}: ${data.currentStock} unidades (min: ${data.minStock})`,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('payment:created', () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
      queryClient.invalidateQueries({ queryKey: ['payments-today'] });
      queryClient.invalidateQueries({ queryKey: ['delivered-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('cash-register:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] });
    });

    socket.on('ingredient:alert', (data: { ingredientName: string; currentStock: number; minStock: number }) => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient-alerts'] });

      playSound('alert');
      toast.error(`Ingrediente bajo: ${data.ingredientName}`, {
        description: `${data.currentStock} (min: ${data.minStock})`,
        duration: 6000,
      });

      addNotification({
        type: 'order_updated',
        title: 'Ingrediente Bajo',
        message: `${data.ingredientName}: ${data.currentStock} (min: ${data.minStock})`,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('delivery:debt-created', (data: { driverName?: string; foodAmount?: number }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-debts'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-debts-summary'] });
      addNotification({
        type: 'order_updated',
        title: 'Nueva Deuda',
        message: `${data.driverName ?? 'Repartidor'} acumulo deuda${data.foodAmount ? ` de $${data.foodAmount.toFixed(2)}` : ''}`,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('delivery:debt-settled', () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-debts'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-debts-summary'] });
    });

    socket.on('delivery:debt-updated', () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-debts'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-debts-summary'] });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, user, queryClient, addNotification]);

  return (
    <SocketContext.Provider value={{ isConnected, notifications, unreadCount, clearNotifications, dismissNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
