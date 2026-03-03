import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  Crown,
  ExternalLink,
  Download,
  CreditCard,
  Check,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/config/api';

// ─── Types ──────────────────────────────────────

interface SubStatus {
  plan: string;
  hasSubscription: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  currentPriceId: string | null;
  billingInterval: 'monthly' | 'yearly' | null;
  limits: { maxTables: number; maxUsers: number; maxProducts: number };
  usage: { tables: number; users: number; products: number };
}

interface Invoice {
  id: string;
  number: string | null;
  date: string | null;
  amount: number;
  currency: string;
  status: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

interface PaymentMethodInfo {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

// ─── Constants ──────────────────────────────────

const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  basic: { monthly: 'price_1T6LW32QogbirSNpeE3q01Si', yearly: 'price_1T6LWD2QogbirSNp9HOxbCch' },
  professional: { monthly: 'price_1T6LWO2QogbirSNpFideOTDG', yearly: 'price_1T6LWe2QogbirSNphZ6ToNmj' },
  premium: { monthly: 'price_1T6LWs2QogbirSNptsw8JCiL', yearly: 'price_1T6LY62QogbirSNpO3RP8Edr' },
};

const PLANS = [
  {
    key: 'basic',
    name: 'Basico',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    limits: { tables: 5, users: 3, products: 20 },
    features: ['Menu digital con QR', 'Gestion de pedidos', 'Punto de venta', 'Inventario basico', 'Reportes basicos', 'Branding en QR'],
  },
  {
    key: 'professional',
    name: 'Profesional',
    monthlyPrice: 599,
    yearlyPrice: 5990,
    limits: { tables: 15, users: 10, products: 60 },
    features: ['Todo de Basico', '15 mesas', '10 usuarios', '60 productos', 'Reportes completos', 'Branding en QR'],
  },
  {
    key: 'premium',
    name: 'Premium',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    limits: { tables: -1, users: -1, products: -1 },
    features: ['Todo de Profesional', 'Mesas ilimitadas', 'Usuarios ilimitados', 'Productos ilimitados', 'Exportar reportes', 'Soporte prioritario'],
  },
];

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-jade/20 text-jade border-jade/30' },
  trialing: { label: 'Prueba', color: 'bg-gold/20 text-gold border-gold/30' },
  expired: { label: 'Expirado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  free: { label: 'Gratis', color: 'bg-silver/20 text-silver border-silver/30' },
};

function getStatusKey(sub: SubStatus): string {
  if (sub.isTrialing) return 'trialing';
  if (sub.isExpired) return 'expired';
  if (sub.hasSubscription) return 'active';
  return 'free';
}

function getUsagePercent(used: number, max: number): number {
  if (max >= 999) return 0; // unlimited
  if (max <= 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

function getUsageColor(percent: number): string {
  if (percent > 90) return 'bg-red-500';
  if (percent > 70) return 'bg-yellow-500';
  return 'bg-jade';
}

function getUsageTextColor(percent: number): string {
  if (percent > 90) return 'text-red-400';
  if (percent > 70) return 'text-yellow-400';
  return 'text-jade';
}

function formatBrand(brand: string): string {
  const brands: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', discover: 'Discover' };
  return brands[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);
}

// ─── Component ──────────────────────────────────

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const { data: subStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => apiFetch<SubStatus>('/subscriptions/status', { auth: true }),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['subscription-invoices'],
    queryFn: () => apiFetch<{ invoices: Invoice[] }>('/subscriptions/invoices', { auth: true }),
  });

  const { data: pmData } = useQuery({
    queryKey: ['subscription-payment-method'],
    queryFn: () => apiFetch<{ paymentMethod: PaymentMethodInfo | null }>('/subscriptions/payment-method', { auth: true }),
  });

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

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      toast.success('Suscripcion activada correctamente');
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    }
  }, [searchParams, queryClient]);

  useEffect(() => {
    if (subStatus?.billingInterval) {
      setBillingCycle(subStatus.billingInterval);
    }
  }, [subStatus?.billingInterval]);

  if (statusLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-gold animate-spin" /></div>;
  }

  if (!subStatus) return null;

  const statusKey = getStatusKey(subStatus);
  const badge = STATUS_BADGES[statusKey];
  const currentPlan = PLANS.find(p => p.key === subStatus.plan);
  const invoices = invoicesData?.invoices ?? [];
  const paymentMethod = pmData?.paymentMethod ?? null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Receipt size={20} className="text-gold" />
        <h2 className="text-white text-xl font-light tracking-wide">Facturacion</h2>
      </div>

      {/* ─── Section 1: Plan Actual ─── */}
      <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Crown size={18} className="text-gold" />
              <h3 className="text-white text-lg font-medium">
                Plan {currentPlan?.name ?? subStatus.plan}
              </h3>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${badge.color}`}>
                {badge.label}
              </span>
            </div>

            {subStatus.hasSubscription && currentPlan && (
              <p className="text-silver text-sm">
                ${billingCycle === 'yearly' ? currentPlan.yearlyPrice.toLocaleString() : currentPlan.monthlyPrice.toLocaleString()} MXN / {billingCycle === 'yearly' ? 'ano' : 'mes'}
              </p>
            )}

            {subStatus.hasSubscription && subStatus.planExpiresAt && (
              <p className="text-silver-muted text-xs">
                Proximo cobro: {new Date(subStatus.planExpiresAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}

            {subStatus.isTrialing && subStatus.trialEndsAt && (
              <p className="text-gold-muted text-xs">
                Prueba termina: {new Date(subStatus.trialEndsAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {subStatus.hasSubscription && (
            <button
              onClick={() => portalMut.mutate()}
              disabled={portalMut.isPending}
              className="flex items-center gap-2 text-gold text-sm font-medium hover:text-gold-light transition-colors border border-gold/30 px-4 py-2 rounded-xl hover:bg-gold/5"
            >
              {portalMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              Gestionar suscripcion
            </button>
          )}
        </div>
      </div>

      {/* ─── Section 2: Uso Actual ─── */}
      <div>
        <h3 className="text-silver text-sm font-medium tracking-wide mb-4">USO ACTUAL</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { label: 'Mesas', used: subStatus.usage.tables, max: subStatus.limits.maxTables },
            { label: 'Usuarios', used: subStatus.usage.users, max: subStatus.limits.maxUsers },
            { label: 'Productos', used: subStatus.usage.products, max: subStatus.limits.maxProducts },
          ] as const).map((meter) => {
            const isUnlimited = meter.max >= 999;
            const percent = getUsagePercent(meter.used, meter.max);

            return (
              <div key={meter.label} className="bg-tonalli-black-card border border-subtle rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-silver-muted text-xs font-medium tracking-wider">{meter.label.toUpperCase()}</span>
                  <span className={`text-sm font-semibold ${isUnlimited ? 'text-gold' : getUsageTextColor(percent)}`}>
                    {meter.used}{isUnlimited ? '' : ` / ${meter.max}`}
                  </span>
                </div>
                {isUnlimited ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 flex-1 rounded-full bg-gold/20">
                      <div className="h-full rounded-full bg-gold w-full" />
                    </div>
                    <span className="text-gold text-[10px] font-medium">Ilimitado</span>
                  </div>
                ) : (
                  <div className="h-2 rounded-full bg-tonalli-black-soft overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${getUsageColor(percent)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Section 3: Planes ─── */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-silver text-sm font-medium tracking-wide">PLANES</h3>
          <div className="flex items-center gap-1 bg-tonalli-black-card border border-subtle rounded-xl p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                billingCycle === 'monthly' ? 'bg-gold/20 text-gold' : 'text-silver-muted hover:text-silver'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                billingCycle === 'yearly' ? 'bg-gold/20 text-gold' : 'text-silver-muted hover:text-silver'
              }`}
            >
              Anual <span className="text-jade text-[10px] ml-1">-17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === subStatus.plan;
            const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            const isUpgrade = !isCurrent && PLANS.findIndex(p => p.key === plan.key) > PLANS.findIndex(p => p.key === subStatus.plan);

            return (
              <div
                key={plan.key}
                className={`relative bg-tonalli-black-card border rounded-2xl p-5 flex flex-col ${
                  isCurrent ? 'border-gold/40 ring-1 ring-gold/20' : 'border-subtle'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] bg-gold text-tonalli-black px-3 py-0.5 rounded-full font-bold tracking-wider">
                    ACTUAL
                  </span>
                )}

                <h4 className="text-white text-base font-medium mb-1">{plan.name}</h4>
                <div className="mb-4">
                  <span className="text-gold text-2xl font-bold">${price.toLocaleString()}</span>
                  <span className="text-silver-muted text-xs ml-1">MXN / {billingCycle === 'yearly' ? 'ano' : 'mes'}</span>
                </div>

                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-silver text-xs">
                      <Check size={12} className="text-jade mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gold/10 text-gold/50 cursor-default"
                  >
                    Plan actual
                  </button>
                ) : isUpgrade && !subStatus.hasSubscription ? (
                  <button
                    onClick={() => checkoutMut.mutate(PLAN_PRICES[plan.key][billingCycle])}
                    disabled={checkoutMut.isPending}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gold hover:bg-gold-light text-tonalli-black transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {checkoutMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <><ArrowRight size={12} /> Mejorar</>}
                  </button>
                ) : (
                  <button
                    onClick={() => subStatus.hasSubscription ? portalMut.mutate() : checkoutMut.mutate(PLAN_PRICES[plan.key][billingCycle])}
                    disabled={portalMut.isPending || checkoutMut.isPending}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold border border-gold/30 text-gold hover:bg-gold/10 transition-colors disabled:opacity-40"
                  >
                    {(portalMut.isPending || checkoutMut.isPending) ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Cambiar'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Section 4: Facturas + Metodo de Pago ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices */}
        <div className="lg:col-span-2">
          <h3 className="text-silver text-sm font-medium tracking-wide mb-4">FACTURAS RECIENTES</h3>
          <div className="bg-tonalli-black-card border border-subtle rounded-2xl overflow-hidden">
            {invoices.length === 0 ? (
              <p className="text-silver-muted text-sm text-center py-8">Sin facturas aun</p>
            ) : (
              <div className="divide-y divide-subtle">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{inv.number || inv.id.slice(0, 12)}</p>
                      <p className="text-silver-muted text-xs">
                        {inv.date ? new Date(inv.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-white text-sm font-medium">${inv.amount.toLocaleString()} {inv.currency}</p>
                      <span className={`text-[10px] font-medium ${
                        inv.status === 'paid' ? 'text-jade' : inv.status === 'open' ? 'text-gold' : 'text-silver-muted'
                      }`}>
                        {inv.status === 'paid' ? 'Pagada' : inv.status === 'open' ? 'Pendiente' : inv.status === 'draft' ? 'Borrador' : inv.status ?? '—'}
                      </span>
                    </div>
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-silver-dark hover:text-gold transition-colors p-1"
                        title="Descargar PDF"
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <h3 className="text-silver text-sm font-medium tracking-wide mb-4">METODO DE PAGO</h3>
          <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-5">
            {paymentMethod ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 bg-tonalli-black-soft rounded-md flex items-center justify-center">
                    <CreditCard size={16} className="text-silver" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{formatBrand(paymentMethod.brand)} **** {paymentMethod.last4}</p>
                    <p className="text-silver-muted text-xs">Exp. {String(paymentMethod.expMonth).padStart(2, '0')}/{paymentMethod.expYear}</p>
                  </div>
                </div>
                <button
                  onClick={() => portalMut.mutate()}
                  disabled={portalMut.isPending}
                  className="w-full py-2 rounded-xl text-xs font-medium border border-gold/30 text-gold hover:bg-gold/10 transition-colors disabled:opacity-40"
                >
                  Actualizar metodo de pago
                </button>
              </div>
            ) : (
              <div className="text-center py-3">
                <CreditCard size={24} className="text-silver-dark mx-auto mb-2" />
                <p className="text-silver-muted text-sm">Sin metodo de pago</p>
                {subStatus.hasSubscription && (
                  <button
                    onClick={() => portalMut.mutate()}
                    disabled={portalMut.isPending}
                    className="text-gold text-xs font-medium mt-2 hover:text-gold-light transition-colors"
                  >
                    Agregar metodo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
