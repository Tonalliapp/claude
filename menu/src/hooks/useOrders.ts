import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/config/api';
import type { Order } from '@/types';

export function useClientOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['client-order', orderId],
    queryFn: () => apiFetch<Order>(`/client/orders/${orderId}`),
    enabled: !!orderId,
    refetchInterval: 10000,
  });
}

interface CreateOrderPayload {
  slug: string;
  tableNumber: number;
  items: { productId: string; quantity: number; notes?: string }[];
  notes?: string;
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (data: CreateOrderPayload) =>
      apiFetch<Order>('/client/orders', { method: 'POST', body: data }),
  });
}

export function useRequestBill() {
  return useMutation({
    mutationFn: (data: { slug: string; tableNumber: number }) =>
      apiFetch<{ message: string }>('/client/orders/request-bill', { method: 'POST', body: data }),
  });
}

export function useCallWaiter() {
  return useMutation({
    mutationFn: (data: { slug: string; tableNumber: number; reason?: string }) =>
      apiFetch<{ message: string }>('/client/orders/call-waiter', { method: 'POST', body: data }),
  });
}
