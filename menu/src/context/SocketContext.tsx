import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SOCKET_URL = 'https://api.tonalli.app';

export interface LiveEvent {
  id: string;
  type: 'status' | 'item';
  message: string;
  timestamp: string;
  icon: 'confirm' | 'cook' | 'ready' | 'deliver' | 'item';
}

const STATUS_MESSAGES: Record<string, { message: string; icon: LiveEvent['icon']; toast: string }> = {
  confirmed: { message: 'Tu pedido fue confirmado por el restaurante', icon: 'confirm', toast: 'Pedido confirmado' },
  preparing: { message: 'Están preparando tu pedido', icon: 'cook', toast: 'Preparando tu pedido' },
  ready: { message: 'Tu pedido está listo', icon: 'ready', toast: 'Tu pedido está listo' },
  delivered: { message: 'Tu pedido fue entregado', icon: 'deliver', toast: 'Pedido entregado' },
  paid: { message: 'Pedido pagado — gracias por tu visita', icon: 'deliver', toast: 'Pedido pagado' },
  cancelled: { message: 'Tu pedido fue cancelado', icon: 'confirm', toast: 'Pedido cancelado' },
};

interface SocketContextType {
  isConnected: boolean;
  liveEvents: LiveEvent[];
}

const SocketContext = createContext<SocketContextType>({ isConnected: false, liveEvents: [] });

export function SocketProvider({ tenantId, tableId, children }: { tenantId: string | null; tableId: string | null; children: ReactNode }) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);

  const addEvent = useCallback((event: Omit<LiveEvent, 'id' | 'timestamp'>) => {
    setLiveEvents(prev => [{
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    if (!tenantId || !tableId) return;

    const socket = io(`${SOCKET_URL}/client`, {
      path: '/socket.io/',
      auth: { tenantId, tableId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Backend sends full order object: { id, status, items, ... }
    socket.on('order:updated', (order?: { status?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['client-order'] });

      const status = order?.status;
      if (status && STATUS_MESSAGES[status]) {
        const info = STATUS_MESSAGES[status];
        addEvent({ type: 'status', message: info.message, icon: info.icon });

        if (status === 'ready') {
          toast.success(info.toast, { duration: 5000 });
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        } else if (status === 'cancelled') {
          toast.error(info.toast, { duration: 4000 });
        } else {
          toast(info.toast, { duration: 3000 });
        }
      }
    });

    // Menu availability changed — refresh menu data
    socket.on('menu:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    });

    // Backend sends: { orderId, item: { product: { name }, status } }
    socket.on('order:item:updated', (data?: { item?: { product?: { name?: string }; status?: string } }) => {
      queryClient.invalidateQueries({ queryKey: ['client-order'] });

      const itemName = data?.item?.product?.name;
      const itemStatus = data?.item?.status;
      if (itemName && itemStatus) {
        const statusText = itemStatus === 'preparing' ? 'se está preparando'
          : itemStatus === 'ready' ? 'está listo'
          : itemStatus === 'delivered' ? 'fue entregado'
          : '';
        if (statusText) {
          addEvent({
            type: 'item',
            message: `${itemName} ${statusText}`,
            icon: 'item',
          });
        }
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [tenantId, tableId, queryClient, addEvent]);

  return (
    <SocketContext.Provider value={{ isConnected, liveEvents }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
