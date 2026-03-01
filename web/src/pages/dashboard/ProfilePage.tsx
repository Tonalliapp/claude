import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Lock } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { apiFetch } from '@/config/api';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: (data: { name: string; email: string }) =>
      apiFetch('/auth/profile', { method: 'PUT', body: data, auth: true }),
    onSuccess: () => {
      toast.success('Perfil actualizado');
      // Update localStorage
      if (user) {
        const updated = { ...user, name, email };
        localStorage.setItem('tonalli_user', JSON.stringify(updated));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiFetch('/auth/profile', { method: 'PUT', body: data, auth: true }),
    onSuccess: () => {
      toast.success('Contrasena actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSaveProfile = name.trim() && email.trim();
  const canChangePassword =
    currentPassword && newPassword.length >= 8 && newPassword === confirmPassword;

  return (
    <div className="p-6 lg:p-8 max-w-xl mx-auto">
      <h2 className="text-white text-xl font-light tracking-wide mb-6">Mi Perfil</h2>

      {/* Profile info */}
      <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-gold-glow flex items-center justify-center">
            <User size={20} className="text-gold" />
          </div>
          <div>
            <p className="text-white text-base font-medium">{user?.name}</p>
            <p className="text-gold-muted text-xs uppercase tracking-wider">{user?.role}</p>
          </div>
        </div>

        <div className="space-y-4">
          <InputField label="NOMBRE" value={name} onChange={setName} placeholder="Tu nombre" required />
          <InputField label="EMAIL" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" required />
          <GoldButton
            loading={updateProfile.isPending}
            disabled={!canSaveProfile}
            onClick={() => updateProfile.mutate({ name: name.trim(), email: email.trim() })}
          >
            Guardar Perfil
          </GoldButton>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-status-preparing flex items-center justify-center">
            <Lock size={16} className="text-silver" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Cambiar contrasena</p>
            <p className="text-silver-dark text-xs">Minimo 8 caracteres</p>
          </div>
        </div>

        <div className="space-y-4">
          <InputField
            label="CONTRASENA ACTUAL"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Tu contrasena actual"
            type="password"
            required
          />
          <InputField
            label="NUEVA CONTRASENA"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Minimo 8 caracteres"
            type="password"
            required
            error={newPassword && newPassword.length < 8 ? 'Minimo 8 caracteres' : undefined}
          />
          <InputField
            label="CONFIRMAR CONTRASENA"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repite la nueva contrasena"
            type="password"
            required
            error={confirmPassword && confirmPassword !== newPassword ? 'Las contrasenas no coinciden' : undefined}
          />
          <GoldButton
            loading={changePassword.isPending}
            disabled={!canChangePassword}
            onClick={() => changePassword.mutate({ currentPassword, newPassword })}
          >
            Cambiar Contrasena
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
