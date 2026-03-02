import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlob } from '@/config/api';
import type { TenantListItem, PaginatedResponse } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import DataTable, { type Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import SearchInput from '@/components/SearchInput';
import Pagination from '@/components/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function TenantsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TenantListItem | null>(null);
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (statusFilter) params.set('status', statusFilter);
  if (planFilter) params.set('plan', planFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', page, debouncedSearch, statusFilter, planFilter],
    queryFn: () => apiFetch<PaginatedResponse<TenantListItem>>(`/admin/tenants?${params}`, { auth: true }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/tenants/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => {
      toast.success('Restaurante eliminado');
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns: Column<TenantListItem>[] = [
    { key: 'name', label: 'Nombre', render: (t) => <span className="text-white font-medium">{t.name}</span> },
    { key: 'slug', label: 'Slug', render: (t) => <span className="text-silver-muted">{t.slug}</span> },
    { key: 'plan', label: 'Plan', render: (t) => <span className="text-gold-muted capitalize">{t.plan}</span> },
    { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'users', label: 'Usuarios', render: (t) => <span className="text-silver">{t.stats.users}</span> },
    { key: 'orders', label: 'Pedidos', render: (t) => <span className="text-silver">{t.stats.orders}</span> },
    {
      key: 'created', label: 'Creado', render: (t) => (
        <span className="text-silver-muted text-xs">{new Date(t.createdAt).toLocaleDateString('es-MX')}</span>
      ),
    },
    {
      key: 'actions', label: '', render: (t) => (
        <button
          onClick={e => { e.stopPropagation(); setDeleteTarget(t); }}
          className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
        >
          Eliminar
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-medium">Restaurantes</h1>
        <button
          onClick={async () => { try { const b = await apiFetchBlob('/admin/tenants/export', { auth: true }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'tenants.csv'; a.click(); URL.revokeObjectURL(u); toast.success('CSV descargado'); } catch (e: any) { toast.error(e.message); } }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gold-border text-gold text-xs font-medium hover:bg-gold/10 transition-colors"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Buscar restaurante..." />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-tonalli-black-card border border-light-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/30"
        >
          <option value="">Todos los status</option>
          <option value="active">Activo</option>
          <option value="suspended">Suspendido</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="bg-tonalli-black-card border border-light-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/30"
        >
          <option value="">Todos los planes</option>
          <option value="basic">Basic</option>
          <option value="professional">Professional</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      <div className="bg-tonalli-black-card border border-gold-border rounded-2xl overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          onRowClick={t => navigate(`/tenants/${t.id}`)}
          emptyMessage="No se encontraron restaurantes"
        />
      </div>

      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar Restaurante"
        message={`Esto eliminara "${deleteTarget?.name}" y todos sus datos permanentemente.`}
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
