import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';

interface BusinessAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'orders' | 'inventory' | 'kitchen' | 'tables' | 'cash';
  title: string;
  message: string;
  action?: string;
}

interface BusinessAlertsResponse {
  alerts: BusinessAlert[];
  checkedAt: string;
}

const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

export function useBusinessAlerts() {
  const shownRef = useRef<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ['business-alerts'],
    queryFn: () => apiFetch<BusinessAlertsResponse>('/reports/business-alerts', { auth: true }),
    refetchInterval: 2 * 60 * 1000, // every 2 minutes
    staleTime: 90 * 1000,
  });

  useEffect(() => {
    if (!data?.alerts) return;

    for (const alert of data.alerts) {
      // Only show each alert once per session (by ID)
      if (shownRef.current.has(alert.id)) continue;
      shownRef.current.add(alert.id);

      const toastFn = alert.severity === 'critical' ? toast.error
        : alert.severity === 'warning' ? toast.warning
        : toast.info;

      toastFn(alert.title, {
        description: alert.message,
        duration: alert.severity === 'critical' ? 12000 : 8000,
        action: alert.action ? {
          label: 'Ver',
          onClick: () => window.location.assign(alert.action!),
        } : undefined,
      });
    }

    // Clean up IDs that are no longer in the response (alert resolved)
    const currentIds = new Set(data.alerts.map(a => a.id));
    for (const id of shownRef.current) {
      if (!currentIds.has(id)) {
        shownRef.current.delete(id);
      }
    }
  }, [data]);

  return {
    alerts: data?.alerts ?? [],
    criticalCount: data?.alerts.filter(a => a.severity === 'critical').length ?? 0,
  };
}
