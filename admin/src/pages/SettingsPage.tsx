import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthProvider';
import { apiFetch } from '@/config/api';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setLoading(true);
    try {
      await apiFetch('/auth/profile', {
        method: 'PUT',
        body: { currentPassword, newPassword },
        auth: true,
      });
      toast.success('Contrasena actualizada');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <h1 className="text-white text-xl font-medium">Configuracion</h1>

      <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
        <h3 className="text-white text-sm font-medium mb-4">Perfil</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-silver-muted">Nombre</span><span className="text-white">{user?.name}</span></div>
          <div className="flex justify-between"><span className="text-silver-muted">Email</span><span className="text-white">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-silver-muted">Rol</span><span className="text-gold capitalize">{user?.role}</span></div>
        </div>
      </div>

      <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
        <h3 className="text-white text-sm font-medium mb-4">Cambiar Contrasena</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <InputField
            label="CONTRASENA ACTUAL"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            required
          />
          <InputField
            label="NUEVA CONTRASENA"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            required
          />
          <GoldButton type="submit" loading={loading} className="w-auto px-6">
            Actualizar Contrasena
          </GoldButton>
        </form>
      </div>
    </div>
  );
}
