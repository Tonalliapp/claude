import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, registerLoading } = useAuth();
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const isValid = restaurantName.trim() && ownerName.trim() && email.trim() && password.trim();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setError('');
    try {
      await register({
        restaurantName: restaurantName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
      });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    }
  };

  const fields = [
    { label: 'NOMBRE DEL RESTAURANTE *', placeholder: 'La Cocina de María', value: restaurantName, onChange: setRestaurantName },
    { label: 'TU NOMBRE *', placeholder: 'Carlos Valenzuela', value: ownerName, onChange: setOwnerName },
    { label: 'EMAIL *', placeholder: 'tu@correo.com', value: email, onChange: setEmail, type: 'email' },
    { label: 'CONTRASEÑA *', placeholder: 'Mínimo 8 caracteres', value: password, onChange: setPassword, type: 'password' },
    { label: 'TELÉFONO', placeholder: '3221234567', value: phone, onChange: setPhone, type: 'tel' },
    { label: 'DIRECCIÓN', placeholder: 'Ciudad, Estado, México', value: address, onChange: setAddress },
  ];

  return (
    <div className="min-h-screen bg-tonalli-black flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="font-display text-gold text-[28px] tracking-[8px] font-light">TONALLI</h1>
          </Link>
          <div className="w-14 h-px bg-jade-muted/50 mx-auto my-2.5" />
          <p className="text-silver-muted text-xs tracking-[2px]">Registra tu restaurante</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {fields.map(f => (
            <div key={f.label} className="space-y-1.5">
              <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">{f.label}</label>
              <input
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                autoComplete={f.type === 'email' ? 'email' : f.type === 'password' ? 'new-password' : undefined}
                className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-silver-dark focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={!isValid || registerLoading}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-tonalli-black py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center mt-2"
          >
            {registerLoading ? (
              <div className="h-5 w-5 border-2 border-tonalli-black/30 border-t-tonalli-black rounded-full animate-spin" />
            ) : (
              'Crear mi restaurante'
            )}
          </button>

          <p className="text-center text-silver-muted text-[13px]">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-gold font-medium hover:text-gold-light transition-colors">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
