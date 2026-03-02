import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlob } from '@/config/api';
import type { UserListItem, PaginatedResponse } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import DataTable, { type Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import SearchInput from '@/components/SearchInput';
import Pagination from '@/components/Pagination';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (statusFilter) params.set('status', statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch, statusFilter],
    queryFn: () => apiFetch<PaginatedResponse<UserListItem>>(`/admin/users?${params}`, { auth: true }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/admin/users/${id}`, { method: 'PUT', body: { active }, auth: true }),
    onSuccess: () => {
      toast.success('Usuario actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns: Column<UserListItem>[] = [
    { key: 'name', label: 'Nombre', render: (u) => (
      <div>
        <span className="text-white font-medium">{u.name}</span>
        <p className="text-silver-muted text-xs">@{u.username}</p>
      </div>
    )},
    { key: 'email', label: 'Email', render: (u) => <span className="text-silver-muted text-xs">{u.email ?? '-'}</span> },
    { key: 'role', label: 'Rol', render: (u) => <span className="text-gold-muted capitalize text-xs">{u.role}</span> },
    { key: 'tenant', label: 'Restaurante', render: (u) => <span className="text-silver text-xs">{u.tenant?.name ?? '-'}</span> },
    { key: 'active', label: 'Status', render: (u) => <StatusBadge status={String(u.active)} /> },
    { key: 'lastLogin', label: 'Ultimo login', render: (u) => (
      <span className="text-silver-muted text-xs">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('es-MX') : 'Nunca'}</span>
    )},
    { key: 'actions', label: '', render: (u) => (
      <button
        onClick={() => toggleMutation.mutate({ id: u.id, active: !u.active })}
        className={`text-xs transition-colors ${u.active ? 'text-red-400/60 hover:text-red-400' : 'text-jade/60 hover:text-jade'}`}
      >
        {u.active ? 'Desactivar' : 'Activar'}
      </button>
    )},
  ];

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-medium">Usuarios</h1>
        <button
          onClick={async () => { try { const b = await apiFetchBlob('/admin/users/export', { auth: true }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'users.csv'; a.click(); URL.revokeObjectURL(u); toast.success('CSV descargado'); } catch (e: any) { toast.error(e.message); } }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gold-border text-gold text-xs font-medium hover:bg-gold/10 transition-colors"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Buscar usuario..." />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-tonalli-black-card border border-light-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/30"
        >
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className="bg-tonalli-black-card border border-gold-border rounded-2xl overflow-hidden">
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No se encontraron usuarios" />
      </div>

      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
    </div>
  );
}
