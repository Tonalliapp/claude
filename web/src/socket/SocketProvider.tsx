import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
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
      addNotification({
        type: 'order_new',
        title: 'Nuevo Pedido',
        message: `Pedido #${String(order.orderNumber).padStart(3, '0')} - ${order.table ? `Mesa ${order.table.number}` : 'Mostrador'}`,
        tableNumber: order.table?.number,
        orderId: order.id,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('order:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
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
      addNotification({
        type: 'bill_requested',
        title: 'Cuenta Solicitada',
        message: `Mesa ${data.tableNumber} solicita la cuenta`,
        tableNumber: data.tableNumber,
        timestamp: data.timestamp,
      });
    });

    socket.on('table:waiter-called', (data: { tableNumber: number; reason?: string; timestamp: string }) => {
      addNotification({
        type: 'waiter_called',
        title: 'Mesero Solicitado',
        message: `Mesa ${data.tableNumber}${data.reason ? ': ' + data.reason : ''}`,
        tableNumber: data.tableNumber,
        timestamp: data.timestamp,
      });
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
