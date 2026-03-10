import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/config/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isValid = password.length >= 8 && password === confirm && token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tonalli-black flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="font-display text-gold text-3xl tracking-[8px] font-light">TONALLI</h1>
          </Link>
          <div className="w-14 h-px bg-jade-muted/50 mx-auto my-3" />
        </div>

        {!token ? (
          <div className="text-center">
            <p className="text-red-400 text-sm mb-4">Enlace inválido o expirado.</p>
            <Link to="/forgot-password" className="text-gold text-sm font-medium hover:text-gold-light transition-colors">
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : success ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-jade-glow flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-jade" />
            </div>
            <h2 className="text-white text-xl font-medium mb-2">Contraseña actualizada</h2>
            <p className="text-silver-muted text-sm mb-6">
              Tu contraseña ha sido restablecida exitosamente.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gold hover:bg-gold-light text-tonalli-black py-3.5 rounded-xl font-semibold transition-colors"
            >
              Iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-white text-2xl font-light tracking-wide">Nueva Contraseña</h2>
            <p className="text-silver-muted text-sm">
              Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">NUEVA CONTRASENA</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-silver-dark hover:text-silver transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">CONFIRMAR CONTRASENA</label>
              <input
                type="password"
                placeholder="Repite la contraseña"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={`w-full bg-tonalli-black-card border rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors ${
                  confirm && confirm !== password ? 'border-red-500/50' : 'border-light-border'
                }`}
              />
              {confirm && confirm !== password && (
                <p className="text-red-400 text-xs">Las contraseñas no coinciden</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-tonalli-black py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-tonalli-black/30 border-t-tonalli-black rounded-full animate-spin" />
              ) : 'Restablecer contraseña'}
            </button>

            <Link to="/login" className="flex items-center justify-center gap-1.5 text-silver-muted text-[13px] hover:text-silver transition-colors">
              <ArrowLeft size={14} />
              Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
