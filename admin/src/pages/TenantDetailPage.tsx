import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Store, Users, ClipboardList, Package, ExternalLink, Check, X as XIcon, CreditCard } from 'lucide-react';
import { apiFetch } from '@/config/api';
import type { TenantDetail, TenantHealthScore } from '@/types';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';
import GoldButton from '@/components/ui/GoldButton';
import Modal from '@/components/ui/Modal';

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', plan: '', maxTables: 0, maxUsers: 0, maxProducts: 0 });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant', id],
    queryFn: () => apiFetch<TenantDetail>(`/admin/tenants/${id}`, { auth: true }),
    enabled: !!id,
  });

  const { data: health } = useQuery({
    queryKey: ['admin-tenant-health', id],
    queryFn: () => apiFetch<TenantHealthScore>(`/admin/tenants/${id}/health`, { auth: true }),
    enabled: !!id,
  });

  const impersonateMutation = useMutation({
    mutationFn: () => apiFetch<{ accessToken: string; refreshToken: string }>(`/admin/tenants/${id}/impersonate`, { method: 'POST', auth: true }),
    onSuccess: (data) => {
      const url = `https://tonalli.app/login?impersonate=${data.accessToken}&refresh=${data.refreshToken}`;
      window.open(url, '_blank');
      toast.success('Sesion de restaurante abierta en nueva pestana');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch(`/admin/tenants/${id}`, { method: 'PUT', body, auth: true }),
    onSuccess: () => {
      toast.success('Restaurante actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] });
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = () => {
    if (!tenant) return;
    setEditForm({
      status: tenant.status,
      plan: tenant.plan,
      maxTables: tenant.maxTables,
      maxUsers: tenant.maxUsers,
      maxProducts: tenant.maxProducts,
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editForm);
  };

  if (isLoading || !tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/tenants')} className="text-silver-dark hover:text-silver transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-white text-xl font-medium">{tenant.name}</h1>
          <p className="text-silver-muted text-sm">{tenant.slug}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={tenant.status} />
          <button
            onClick={() => impersonateMutation.mutate()}
            disabled={impersonateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-jade/30 text-jade text-xs font-medium hover:bg-jade/10 transition-colors"
          >
            <ExternalLink size={14} />
            Entrar como restaurante
          </button>
          <GoldButton variant="outline" onClick={openEdit} className="w-auto px-4 py-2">
            Editar
          </GoldButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Usuarios" value={`${tenant.stats.orders > 0 ? tenant.users.length : 0}/${tenant.maxUsers}`} icon={<Users size={20} />} />
        <KpiCard label="Pedidos" value={tenant.stats.orders} icon={<ClipboardList size={20} />} />
        <KpiCard label="Productos" value={`${tenant.stats.products}/${tenant.maxProducts}`} icon={<Package size={20} />} />
        <KpiCard label="Ingresos" value={`$${tenant.stats.totalRevenue.toLocaleString()}`} icon={<Store size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
          <h3 className="text-white text-sm font-medium mb-4">Informacion</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-silver-muted">Plan</span><span className="text-gold capitalize">{tenant.plan}</span></div>
            <div className="flex justify-between"><span className="text-silver-muted">Mesas</span><span className="text-silver">{tenant.stats.tables}/{tenant.maxTables}</span></div>
            <div className="flex justify-between"><span className="text-silver-muted">Categorias</span><span className="text-silver">{tenant.stats.categories}</span></div>
            <div className="flex justify-between"><span className="text-silver-muted">Creado</span><span className="text-silver">{new Date(tenant.createdAt).toLocaleDateString('es-MX')}</span></div>
          </div>
        </div>

        <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
          <h3 className="text-white text-sm font-medium mb-4">Usuarios ({tenant.users.length})</h3>
          <div className="space-y-2">
            {tenant.users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-white text-sm">{u.name} <span className="text-silver-muted">@{u.username}</span></p>
                  {u.email && <p className="text-silver-muted text-xs">{u.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gold-muted text-xs capitalize">{u.role}</span>
                  <StatusBadge status={String(u.active)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stripe Data */}
        <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-gold" />
            <h3 className="text-white text-sm font-medium">Suscripcion</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-silver-muted">Stripe Customer</span><span className="text-silver font-mono text-xs">{tenant.stripeCustomerId ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-silver-muted">Stripe Sub</span><span className="text-silver font-mono text-xs">{tenant.stripeSubId ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-silver-muted">Price ID</span><span className="text-silver font-mono text-xs">{tenant.stripePriceId ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-silver-muted">Trial finaliza</span><span className="text-silver">{tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString('es-MX') : '-'}</span></div>
            <div className="flex justify-between"><span className="text-silver-muted">Plan expira</span><span className="text-silver">{tenant.planExpiresAt ? new Date(tenant.planExpiresAt).toLocaleDateString('es-MX') : '-'}</span></div>
            {tenant.stripeCustomerId && (
              <a
                href={`https://dashboard.stripe.com/customers/${tenant.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-gold text-xs hover:underline"
              >
                <ExternalLink size={12} />
                Ver en Stripe Dashboard
              </a>
            )}
          </div>
        </div>

        {/* Health Score */}
        {health && (
          <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
            <h3 className="text-white text-sm font-medium mb-4">Health Score</h3>
            <div className="flex items-center gap-6 mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#2A2A2A" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke={health.score >= 70 ? '#4CAF50' : health.score >= 40 ? '#C9A84C' : '#EF4444'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(health.score / 100) * 213.6} 213.6`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">{health.score}</span>
              </div>
              <div className="flex-1 space-y-1.5">
                {health.checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {c.passed
                      ? <Check size={14} className="text-jade shrink-0" />
                      : <XIcon size={14} className="text-red-400 shrink-0" />
                    }
                    <span className={`text-xs ${c.passed ? 'text-silver' : 'text-silver-muted'}`}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {tenant.stats.ordersByStatus.length > 0 && (
        <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
          <h3 className="text-white text-sm font-medium mb-4">Pedidos por Status</h3>
          <div className="flex flex-wrap gap-4">
            {tenant.stats.ordersByStatus.map(s => (
              <div key={s.status} className="text-center">
                <p className="text-white text-lg font-semibold">{s.count}</p>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <Modal title="Editar Restaurante" onClose={() => setEditing(false)} maxWidth="max-w-lg">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">STATUS</label>
              <select
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/30"
              >
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">PLAN</label>
              <select
                value={editForm.plan}
                onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
                className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/30"
              >
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['maxTables', 'maxUsers', 'maxProducts'] as const).map(field => (
                <div key={field} className="space-y-1.5">
                  <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">{field.replace('max', 'MAX ')}</label>
                  <input
                    type="number"
                    value={editForm[field]}
                    onChange={e => setEditForm({ ...editForm, [field]: Number(e.target.value) })}
                    className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/30"
                  />
                </div>
              ))}
            </div>
            <GoldButton onClick={handleSave} loading={updateMutation.isPending}>
              Guardar Cambios
            </GoldButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
