import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlob } from '@/config/api';
import type { AuditLog, PaginatedResponse } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import DataTable, { type Column } from '@/components/DataTable';
import SearchInput from '@/components/SearchInput';
import Pagination from '@/components/Pagination';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (debouncedSearch) params.set('search', debouncedSearch);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, debouncedSearch],
    queryFn: () => apiFetch<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${params}`, { auth: true }),
  });

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp', label: 'Fecha', render: (l) => (
        <span className="text-silver-muted text-xs">
          {new Date(l.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    { key: 'user', label: 'Usuario', render: (l) => <span className="text-white text-sm">{l.user.name}</span> },
    { key: 'action', label: 'Accion', render: (l) => <span className="text-gold text-sm font-mono">{l.action}</span> },
    { key: 'target', label: 'Tipo', render: (l) => <span className="text-silver capitalize">{l.targetType}</span> },
    { key: 'targetId', label: 'Target ID', render: (l) => <span className="text-silver-muted text-xs font-mono">{l.targetId?.slice(0, 8) ?? '-'}</span> },
    { key: 'ip', label: 'IP', render: (l) => <span className="text-silver-muted text-xs">{l.ipAddress ?? '-'}</span> },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-medium">Audit Logs</h1>
        <button
          onClick={async () => { try { const b = await apiFetchBlob('/admin/audit-logs/export', { auth: true }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'audit-logs.csv'; a.click(); URL.revokeObjectURL(u); toast.success('CSV descargado'); } catch (e: any) { toast.error(e.message); } }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gold-border text-gold text-xs font-medium hover:bg-gold/10 transition-colors"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Buscar por accion..." />
        </div>
      </div>

      <div className="bg-tonalli-black-card border border-gold-border rounded-2xl overflow-hidden">
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="Sin logs de auditoria" />
      </div>

      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
    </div>
  );
}
