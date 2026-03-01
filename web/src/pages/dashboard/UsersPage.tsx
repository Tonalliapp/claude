import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { User } from '@/types';
import Modal from '@/components/ui/Modal';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';

const ROLES: Record<string, { label: string; color: string; bg: string }> = {
  owner: { label: 'Dueno', color: 'text-gold', bg: 'bg-status-pending' },
  admin: { label: 'Admin', color: 'text-gold-light', bg: 'bg-gold-light/10' },
  cashier: { label: 'Cajero', color: 'text-silver', bg: 'bg-status-preparing' },
  waiter: { label: 'Mesero', color: 'text-jade-light', bg: 'bg-jade-glow' },
  kitchen: { label: 'Cocina', color: 'text-jade-bright', bg: 'bg-jade-bright/10' },
};

const AVAILABLE = ['admin', 'cashier', 'waiter', 'kitchen'] as const;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('waiter');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<User[]>('/users', { auth: true }),
  });

  const addMut = useMutation({
    mutationFn: (d: { name: string; username: string; password: string; role: string }) => apiFetch('/users', { method: 'POST', body: d, auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowAdd(false); setName(''); setUsername(''); setPassword(''); setRole('waiter'); toast.success('Usuario creado'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiFetch(`/users/${id}`, { method: 'PUT', body: { active }, auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = Array.isArray(users) ? users : [];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white text-xl font-light tracking-wide">Usuarios</h2>
        <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full border border-gold flex items-center justify-center text-gold hover:bg-gold/10 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-20">
          <Shield size={40} className="text-silver-dark mx-auto mb-3" />
          <p className="text-silver-muted text-sm">Sin usuarios adicionales</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(u => {
            const cfg = ROLES[u.role] ?? ROLES.waiter;
            const isOwner = u.role === 'owner';
            return (
              <div key={u.id} className="flex items-center bg-tonalli-black-card border border-subtle rounded-2xl p-3.5 gap-3">
                <div className="w-10 h-10 rounded-full bg-tonalli-black-soft flex items-center justify-center">
                  <span className="text-silver text-base font-semibold">{u.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[15px] font-medium">{u.name}</p>
                  <p className="text-silver-dark text-xs mt-0.5">@{u.username}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
                  {!isOwner && (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={u.active !== false} onChange={e => toggleMut.mutate({ id: u.id, active: e.target.checked })} className="sr-only peer" />
                      <div className="w-9 h-5 bg-tonalli-black-elevated peer-checked:bg-jade-dark rounded-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-silver-dark peer-checked:after:bg-jade-bright after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Nuevo Usuario" onClose={() => setShowAdd(false)}>
          <InputField label="NOMBRE" value={name} onChange={setName} placeholder="Ana Garcia" required />
          <InputField label="USUARIO" value={username} onChange={setUsername} placeholder="ana" required />
          <InputField label="CONTRASENA" value={password} onChange={setPassword} placeholder="Minimo 6 caracteres" type="password" required />
          <div className="space-y-1.5">
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">ROL</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE.map(r => {
                const c = ROLES[r];
                const active = role === r;
                return (
                  <button key={r} onClick={() => setRole(r)} className={`px-3.5 py-2.5 rounded-lg border text-[13px] font-medium transition-colors ${active ? `border-gold ${c.bg} ${c.color}` : 'border-light-border bg-tonalli-black-card text-silver-dark'}`}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <GoldButton loading={addMut.isPending} disabled={!name.trim() || !username.trim() || !password.trim()} onClick={() => addMut.mutate({ name, username, password, role })}>
            Crear Usuario
          </GoldButton>
        </Modal>
      )}
    </div>
  );
}
