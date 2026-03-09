import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import { useAuth } from '@/auth/AuthProvider';
import { Mail, Loader2, RefreshCw } from 'lucide-react';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const email = (location.state as { email?: string })?.email || user?.email || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const fullCode = code.join('');

  const handleVerify = async () => {
    if (fullCode.length !== 6 || !email) return;
    setLoading(true);
    try {
      await apiFetch('/auth/verify-email', { method: 'POST', body: { email, code: fullCode } });
      toast.success('Email verificado correctamente');
      // Update localStorage user
      const stored = localStorage.getItem('tonalli_user');
      if (stored) {
        const u = JSON.parse(stored);
        u.emailVerified = true;
        localStorage.setItem('tonalli_user', JSON.stringify(u));
      }
      navigate('/onboarding', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Codigo incorrecto');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await apiFetch('/auth/resend-verification', { method: 'POST', body: { email } });
      toast.success('Codigo reenviado a tu email');
    } catch {
      toast.error('Error al reenviar codigo');
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (fullCode.length === 6) handleVerify();
  }, [fullCode]);

  return (
    <div className="min-h-screen bg-tonalli-black flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px] text-center">
        <Link to="/" className="inline-block hover:opacity-80 transition-opacity mb-6">
          <h1 className="font-display text-gold text-[28px] tracking-[8px] font-light">TONALLI</h1>
        </Link>

        <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-gold" />
          </div>

          <h2 className="text-white text-xl font-light mb-2">Verifica tu email</h2>
          <p className="text-silver-muted text-sm mb-6 leading-relaxed">
            Enviamos un codigo de 6 digitos a
            <br />
            <span className="text-gold font-medium">{email || 'tu correo'}</span>
          </p>

          <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 bg-tonalli-black border border-light-border rounded-xl text-center text-white text-2xl font-semibold focus:outline-none focus:border-gold/50 transition-colors"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={fullCode.length !== 6 || loading}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-tonalli-black py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 mb-4"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verificar'}
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center justify-center gap-1.5 mx-auto text-silver-muted hover:text-silver text-sm transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
            Reenviar codigo
          </button>
        </div>

        <p className="text-silver-dark text-xs mt-6">
          Revisa tu bandeja de entrada y spam
        </p>
      </div>
    </div>
  );
}
