import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { apiFetch } from '@/config/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
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

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-jade-glow flex items-center justify-center mx-auto mb-5">
              <Mail size={28} className="text-jade" />
            </div>
            <h2 className="text-white text-xl font-medium mb-2">Revisa tu correo</h2>
            <p className="text-silver-muted text-sm mb-6">
              Si existe una cuenta con <span className="text-white">{email}</span>, recibirás un enlace para restablecer tu contraseña.
            </p>
            <Link to="/login" className="text-gold text-sm font-medium hover:text-gold-light transition-colors">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-white text-2xl font-light tracking-wide">Recuperar Contraseña</h2>
            <p className="text-silver-muted text-sm">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">EMAIL</label>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-tonalli-black py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-tonalli-black/30 border-t-tonalli-black rounded-full animate-spin" />
              ) : 'Enviar enlace'}
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
