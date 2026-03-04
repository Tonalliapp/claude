import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, AlertTriangle, CreditCard, Bike } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';
import type { Restaurant } from '@/types';
import InputField from '@/components/ui/InputField';
import GoldButton from '@/components/ui/GoldButton';
import ImageUpload from '@/components/ui/ImageUpload';

interface YessweraStatus {
  enabled: boolean;
  connectedAt?: string;
}

const MX_TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Centro (CDMX, Guadalajara, Monterrey)' },
  { value: 'America/Cancun', label: 'Sureste (Cancun, Chetumal)' },
  { value: 'America/Mazatlan', label: 'Pacifico (Mazatlan, Tepic)' },
  { value: 'America/Tijuana', label: 'Noroeste (Tijuana, Mexicali)' },
  { value: 'America/Chihuahua', label: 'Sierra (Chihuahua, La Paz)' },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
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

  const updateMut = useMutation({
    mutationFn: (data: { name: string; config: Record<string, string> }) =>
      apiFetch('/tenants/me', { method: 'PUT', body: data, auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenant-settings'] }); toast.success('Configuracion guardada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const { data: yessweraStatus } = useQuery({
    queryKey: ['yesswera-status'],
    queryFn: () => apiFetch<YessweraStatus>('/tenants/me/yesswera', { auth: true }),
  });

  const yessweraMut = useMutation({
    mutationFn: (enabled: boolean) =>
      apiFetch<YessweraStatus>('/tenants/me/yesswera', { method: 'POST', body: { enabled }, auth: true }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['yesswera-status'] });
      toast.success(data.enabled ? 'Delivery con Yesswera activado' : 'Delivery con Yesswera desactivado');
    },
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

        {/* Yesswera Delivery */}
        <div className="bg-tonalli-black-card border border-subtle rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Bike size={16} className="text-orange-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Delivery con Yesswera</p>
                {yessweraStatus?.enabled && yessweraStatus.connectedAt && (
                  <p className="text-silver-dark text-[10px]">
                    Conectado desde {new Date(yessweraStatus.connectedAt).toLocaleDateString('es-MX')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {yessweraStatus?.enabled && (
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                  Conectado
                </span>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={yessweraStatus?.enabled ?? false}
                disabled={yessweraMut.isPending}
                onClick={() => {
                  if (yessweraStatus?.enabled) {
                    setShowDeactivateConfirm(true);
                  } else {
                    yessweraMut.mutate(true);
                  }
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  yessweraStatus?.enabled ? 'bg-orange-500' : 'bg-white/10'
                } ${yessweraMut.isPending ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    yessweraStatus?.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>
          </div>
          {!yessweraStatus?.enabled && (
            <p className="text-silver-dark text-[11px] leading-relaxed">
              Muestra tu menu en la app de delivery Yesswera y recibe pedidos a domicilio directamente en tu cocina.
            </p>
          )}
        </div>

        {/* Deactivate confirmation */}
        {showDeactivateConfirm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowDeactivateConfirm(false)}>
            <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-400" />
                <p className="text-white font-medium">Desactivar delivery</p>
              </div>
              <p className="text-silver-muted text-sm leading-relaxed">
                Tu restaurante dejara de aparecer en Yesswera y no recibiras mas pedidos de delivery. Puedes reactivarlo en cualquier momento.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-light-border text-silver-muted text-sm hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDeactivateConfirm(false);
                    yessweraMut.mutate(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500/20 text-orange-400 text-sm font-medium hover:bg-orange-500/30 transition-colors"
                >
                  Desactivar
                </button>
              </div>
            </div>
          </div>
        )}

        <GoldButton
          loading={updateMut.isPending}
          disabled={!name.trim()}
          onClick={handleSave}
        >
          Guardar Cambios
        </GoldButton>

        {/* Billing link */}
        <Link
          to="/dashboard/billing"
          className="mt-8 flex items-center justify-between border border-gold/20 rounded-2xl p-5 hover:border-gold/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-gold" />
            <div>
              <p className="text-gold text-sm font-medium">Facturacion y suscripcion</p>
              <p className="text-silver-muted text-xs">Gestiona tu plan, facturas y metodo de pago</p>
            </div>
          </div>
          <span className="text-silver-dark group-hover:text-gold transition-colors text-sm">&rarr;</span>
        </Link>

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
