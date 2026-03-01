import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password.trim()) return;
    setError('');
    try {
      await login({ email: email.trim(), username: username.trim(), password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-tonalli-black flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="font-display text-gold text-3xl tracking-[8px] font-light">TONALLI</h1>
          </Link>
          <div className="w-14 h-px bg-jade-muted/50 mx-auto my-3" />
          <p className="text-silver-muted text-xs tracking-[2px]">Panel de Restaurante</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <h2 className="text-white text-2xl font-light tracking-wide">Iniciar Sesión</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">EMAIL DEL RESTAURANTE</label>
            <input
              type="email"
              placeholder="correo@restaurante.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">USUARIO</label>
            <input
              type="text"
              placeholder="admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="off"
              className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">CONTRASEÑA</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 pr-12 text-white text-[15px] placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-3.5 text-silver-dark hover:text-silver transition-colors"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!email.trim() || !username.trim() || !password.trim() || loginLoading}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-tonalli-black py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center"
          >
            {loginLoading ? (
              <div className="h-5 w-5 border-2 border-tonalli-black/30 border-t-tonalli-black rounded-full animate-spin" />
            ) : (
              'Iniciar Sesión'
            )}
          </button>

          <div className="text-center space-y-2">
            <Link to="/forgot-password" className="block text-silver-muted text-[13px] hover:text-silver transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
            <p className="text-silver-muted text-[13px]">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-gold font-medium hover:text-gold-light transition-colors">
                Registra tu restaurante
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
