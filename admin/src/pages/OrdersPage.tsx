import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/config/api';
import type { OrderListItem, PaginatedResponse } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import DataTable, { type Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import SearchInput from '@/components/SearchInput';
import Pagination from '@/components/Pagination';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (statusFilter) params.set('status', statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, debouncedSearch, statusFilter],
    queryFn: () => apiFetch<PaginatedResponse<OrderListItem>>(`/admin/orders?${params}`, { auth: true }),
  });

  const columns: Column<OrderListItem>[] = [
    { key: 'number', label: '#', render: (o) => <span className="text-gold font-medium">#{o.orderNumber}</span> },
    { key: 'tenant', label: 'Restaurante', render: (o) => <span className="text-white text-sm">{o.tenant.name}</span> },
    { key: 'table', label: 'Mesa', render: (o) => <span className="text-silver">{o.tableNumber}</span> },
    { key: 'items', label: 'Items', render: (o) => <span className="text-silver">{o.itemCount}</span> },
    { key: 'total', label: 'Total', render: (o) => <span className="text-white font-medium">${o.total.toFixed(2)}</span> },
    { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'created', label: 'Fecha', render: (o) => (
      <span className="text-silver-muted text-xs">{new Date(o.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
    )},
  ];

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <h1 className="text-white text-xl font-medium">Pedidos</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Buscar por restaurante..." />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-tonalli-black-card border border-light-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/30"
        >
          <option value="">Todos los status</option>
          <option value="pending">Pendiente</option>
          <option value="confirmed">Confirmado</option>
          <option value="preparing">Preparando</option>
          <option value="ready">Listo</option>
          <option value="delivered">Entregado</option>
          <option value="paid">Pagado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div className="bg-tonalli-black-card border border-gold-border rounded-2xl overflow-hidden">
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="No se encontraron pedidos" />
      </div>

      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
    </div>
  );
}
