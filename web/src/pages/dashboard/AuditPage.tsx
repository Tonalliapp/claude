import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { apiFetch } from '@/config/api';

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string };
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
  'order.status_change': 'Cambio de estado',
  'order.cancel': 'Cancelación de pedido',
  'cash_register.open': 'Apertura de caja',
  'cash_register.close': 'Cierre de caja',
  'user.create': 'Creación de usuario',
  'user.update': 'Modificación de usuario',
  'user.deactivate': 'Desactivación de usuario',
};

const ACTION_COLORS: Record<string, string> = {
  'order.cancel': 'bg-red-500/15 text-red-400',
  'cash_register.open': 'bg-jade/15 text-jade',
  'cash_register.close': 'bg-gold/15 text-gold',
  'order.status_change': 'bg-blue-500/15 text-blue-400',
  'user.create': 'bg-jade/15 text-jade',
  'user.update': 'bg-gold/15 text-gold',
  'user.deactivate': 'bg-red-500/15 text-red-400',
};

function formatDetails(action: string, details: Record<string, unknown>): string {
  if (action === 'order.status_change') {
    return `Pedido #${details.orderNumber} → ${details.newStatus}`;
  }
  if (action === 'order.cancel') {
    return `Pedido #${details.orderNumber}: ${details.reason || 'Sin razón'}`;
  }
  if (action === 'cash_register.open') {
    return `Monto inicial: $${Number(details.openingAmount ?? 0).toFixed(0)}`;
  }
  if (action === 'cash_register.close') {
    return `Monto cierre: $${Number(details.closingAmount ?? 0).toFixed(0)}`;
  }
  if (action === 'user.create' || action === 'user.update') {
    return `${details.name} (${details.role})`;
  }
  if (action === 'user.deactivate') {
    return `${details.name}`;
  }
  return JSON.stringify(details).slice(0, 100);
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');

  const params = new URLSearchParams({ page: String(page), limit: '30' });
  if (filterAction) params.set('action', filterAction);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filterAction],
    queryFn: () => apiFetch<AuditResponse>(`/audit?${params}`, { auth: true }),
  });

  const logs = data?.logs ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Shield size={20} className="text-gold" />
        <h2 className="text-white text-xl font-light tracking-wide">Registro de Actividad</h2>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'order.status_change', 'order.cancel', 'cash_register.open', 'cash_register.close', 'user.create', 'user.update'].map((action) => (
          <button
            key={action}
            onClick={() => { setFilterAction(action); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterAction === action
                ? 'bg-gold text-tonalli-black'
                : 'bg-tonalli-black-card text-silver-dark hover:text-silver'
            }`}
          >
            {action === '' ? 'Todos' : ACTION_LABELS[action] ?? action}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 text-gold animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <Shield size={40} className="mx-auto mb-3 text-silver-dark opacity-30" />
          <p className="text-silver-dark text-sm">Sin actividad registrada</p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 bg-tonalli-black-card border border-subtle rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-tonalli-black-soft flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-silver text-xs font-semibold">{log.user.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{log.user.name}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ACTION_COLORS[log.action] ?? 'bg-silver/15 text-silver'}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </div>
                  <p className="text-silver text-xs mt-0.5">{formatDetails(log.action, log.details as Record<string, unknown>)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-silver-dark text-[10px]">
                    {new Date(log.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-silver-dark text-[10px]">
                    {new Date(log.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-5">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-tonalli-black-card text-silver-dark hover:text-silver disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-silver-dark text-xs">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                disabled={page === data.totalPages}
                className="p-2 rounded-lg bg-tonalli-black-card text-silver-dark hover:text-silver disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
