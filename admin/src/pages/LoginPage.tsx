import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';

export default function LoginPage() {
  const { login, loginLoading, loginError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/');
    } catch {
      // error handled by loginError
    }
  };

  return (
    <div className="min-h-screen bg-tonalli-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gold-glow flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-gold" />
          </div>
          <h1 className="font-display text-gold text-2xl tracking-[6px] font-light">TONALLI</h1>
          <p className="text-silver-muted text-sm mt-1">Panel de Administracion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="EMAIL"
            type="email"
            placeholder="admin@tonalli.app"
            value={email}
            onChange={setEmail}
            required
          />
          <InputField
            label="PASSWORD"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            required
          />
          {loginError && (
            <p className="text-red-400 text-sm text-center">{loginError}</p>
          )}
          <GoldButton type="submit" loading={loginLoading}>
            Iniciar Sesion
          </GoldButton>
        </form>
      </div>
    </div>
  );
}
