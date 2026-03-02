import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle, Crown, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { Restaurant } from '@/types';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';
import ImageUpload from '@/components/ui/ImageUpload';

const MX_TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Centro (CDMX, Guadalajara, Monterrey)' },
  { value: 'America/Cancun', label: 'Sureste (Cancun, Chetumal)' },
  { value: 'America/Mazatlan', label: 'Pacifico (Mazatlan, Tepic)' },
  { value: 'America/Tijuana', label: 'Noroeste (Tijuana, Mexicali)' },
  { value: 'America/Chihuahua', label: 'Sierra (Chihuahua, La Paz)' },
];

interface SubStatus {
  plan: string;
  hasSubscription: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  limits: { maxTables: number; maxUsers: number; maxProducts: number };
}

const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  basic: { monthly: 'price_1T6LW32QogbirSNpeE3q01Si', yearly: 'price_1T6LWD2QogbirSNp9HOxbCch' },
  professional: { monthly: 'price_1T6LWO2QogbirSNpFideOTDG', yearly: 'price_1T6LWe2QogbirSNphZ6ToNmj' },
  premium: { monthly: 'price_1T6LWs2QogbirSNptsw8JCiL', yearly: 'price_1T6LY62QogbirSNpO3RP8Edr' },
};

const PLAN_LABELS: Record<string, string> = {
  basic: 'Básico',
  professional: 'Profesional',
  premium: 'Premium',
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('MXN');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [timezone, setTimezone] = useState('America/Mexico_City');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => apiFetch<Restaurant>('/tenants/me', { auth: true }),
  });

  useEffect(() => {
    if (tenant) {
      const cfg = (tenant.config ?? {}) as Record<string, string>;
      setName(tenant.name || '');
      setAddress(cfg.address || '');
      setPhone(cfg.phone || '');
      setCurrency(cfg.currency || 'MXN');
      setOpenTime(cfg.openTime || '09:00');
      setCloseTime(cfg.closeTime || '22:00');
      setTimezone(cfg.timezone || 'America/Mexico_City');
    }
  }, [tenant]);

  // Subscription
  const { data: subStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => apiFetch<SubStatus>('/subscriptions/status', { auth: true }),
  });

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      toast.success('Suscripción activada correctamente');
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    }
  }, [searchParams, queryClient]);

  const checkoutMut = useMutation({
    mutationFn: (priceId: string) =>
      apiFetch<{ url: string }>('/subscriptions/checkout', { method: 'POST', body: { priceId }, auth: true }),
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (e: Error) => toast.error(e.message),
  });

  const portalMut = useMutation({
    mutationFn: () =>
      apiFetch<{ url: string }>('/subscriptions/portal', { method: 'POST', auth: true }),
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (data: { name: string; config: Record<string, string> }) =>
      apiFetch('/tenants/me', { method: 'PUT', body: data, auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenant-settings'] }); toast.success('Configuracion guardada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadLogo = async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    await apiFetch('/tenants/me/logo', { method: 'POST', auth: true, formData });
    queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
    toast.success('Logo actualizado');
  };

  const handleSave = () => {
    updateMut.mutate({
      name: name.trim(),
      config: {
        address: address.trim(),
        phone: phone.trim(),
        currency: currency.trim() || 'MXN',
        openTime,
        closeTime,
        timezone,
      },
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-xl mx-auto">
      <h2 className="text-white text-xl font-light tracking-wide mb-6">Configuracion</h2>

      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <ImageUpload
          currentUrl={tenant?.logoUrl}
          onUpload={uploadLogo}
          label="Logo del restaurante"
          shape="circle"
          size="lg"
        />
        <p className="text-silver-dark text-xs mt-2">Se usa en el menu digital y QR personalizados</p>
      </div>

      <div className="space-y-4">
        <InputField label="NOMBRE DEL RESTAURANTE" value={name} onChange={setName} placeholder="Mi Restaurante" required />
        <InputField label="DIRECCION" value={address} onChange={setAddress} placeholder="Calle, Ciudad, Estado" />
        <InputField label="TELEFONO" value={phone} onChange={setPhone} placeholder="3221234567" type="tel" />
        <InputField label="MONEDA" value={currency} onChange={setCurrency} placeholder="MXN" />

        {/* Operation hours */}
        <div className="bg-tonalli-black-card border border-subtle rounded-xl p-4 space-y-3">
          <p className="text-gold-muted text-[10px] font-medium tracking-[2px]">HORARIO DE OPERACION</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-silver-muted text-[10px]">Apertura</label>
              <input
                type="time"
                value={openTime}
                onChange={e => setOpenTime(e.target.value)}
                className="w-full bg-tonalli-black border border-light-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-silver-muted text-[10px]">Cierre</label>
              <input
                type="time"
                value={closeTime}
                onChange={e => setCloseTime(e.target.value)}
                className="w-full bg-tonalli-black border border-light-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <label className="text-gold-muted text-[10px] font-medium tracking-[2px]">ZONA HORARIA</label>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-gold/30 transition-colors appearance-none"
          >
            {MX_TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        {tenant?.slug && (
          <div className="bg-tonalli-black-card border border-gold-border rounded-xl p-3.5">
            <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-1.5">URL DEL MENU DIGITAL</p>
            <a
              href={`https://menu.tonalli.app/${tenant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold text-sm font-medium hover:text-gold-light transition-colors"
            >
              menu.tonalli.app/{tenant.slug}
            </a>
            <p className="text-silver-dark text-[11px] mt-1">Este es el link que veran tus clientes al escanear el QR</p>
          </div>
        )}

        <GoldButton
          loading={updateMut.isPending}
          disabled={!name.trim()}
          onClick={handleSave}
        >
          Guardar Cambios
        </GoldButton>

        {/* Subscription */}
        <div className="mt-8 border border-gold/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={16} className="text-gold" />
            <p className="text-gold text-sm font-medium">Suscripción</p>
          </div>

          {subStatus && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-silver-muted text-sm">Plan actual</span>
                <span className="text-white text-sm font-medium">
                  {PLAN_LABELS[subStatus.plan] || subStatus.plan}
                  {!subStatus.hasSubscription && ' (Gratis)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-silver-muted text-sm">Límites</span>
                <span className="text-silver text-xs">
                  {subStatus.limits.maxTables} mesas · {subStatus.limits.maxUsers} usuarios · {subStatus.limits.maxProducts} productos
                </span>
              </div>

              {subStatus.hasSubscription && subStatus.planExpiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-silver-muted text-sm">Próximo cobro</span>
                  <span className="text-silver text-sm">
                    {new Date(subStatus.planExpiresAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
              )}

              {subStatus.hasSubscription ? (
                <button
                  onClick={() => portalMut.mutate()}
                  disabled={portalMut.isPending}
                  className="flex items-center gap-2 text-gold text-sm font-medium hover:text-gold-light transition-colors mt-2"
                >
                  {portalMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                  Gestionar suscripción
                </button>
              ) : (
                <div className="space-y-2 mt-3">
                  <p className="text-silver-muted text-xs">Mejora tu plan para desbloquear más funciones:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['basic', 'professional', 'premium'] as const).map(plan => (
                      <button
                        key={plan}
                        onClick={() => checkoutMut.mutate(PLAN_PRICES[plan].monthly)}
                        disabled={checkoutMut.isPending || plan === subStatus.plan}
                        className={`text-xs py-2 px-3 rounded-lg font-medium transition-colors ${
                          plan === subStatus.plan
                            ? 'bg-gold/10 text-gold/50 cursor-default'
                            : 'border border-gold/30 text-gold hover:bg-gold/10'
                        }`}
                      >
                        {PLAN_LABELS[plan]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="mt-8 border border-red-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="text-red-400 text-sm font-medium">Zona de peligro</p>
          </div>
          <p className="text-silver-muted text-xs leading-relaxed mb-3">
            Si deseas eliminar tu cuenta y todos los datos de tu restaurante, contacta a nuestro equipo de soporte.
          </p>
          <a
            href="mailto:hola@tonalli.app"
            className="inline-block text-red-400 text-xs font-medium border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  );
}
