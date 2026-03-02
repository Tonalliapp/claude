import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Básico',
    monthlyPrice: 299,
    yearlyPrice: 2870,
    features: [
      'Menú digital con QR + logo',
      'Pedidos en tiempo real',
      'Hasta 5 mesas',
      '3 usuarios',
      'Hasta 20 productos',
      '1 caja registradora',
      'Inventario (20 productos)',
      'Dashboard básico',
      'Soporte por email',
    ],
  },
  {
    name: 'Profesional',
    popular: true,
    monthlyPrice: 599,
    yearlyPrice: 5750,
    features: [
      'Menú digital con QR + logo',
      'Pedidos en tiempo real',
      'Hasta 15 mesas',
      '10 usuarios',
      'Hasta 60 productos',
      'Hasta 3 cajas',
      'Inventario (60 productos)',
      'Reportes completos',
      'Soporte email + WhatsApp',
    ],
  },
  {
    name: 'Premium',
    monthlyPrice: 999,
    yearlyPrice: 9590,
    features: [
      'Menú digital con QR + logo',
      'Pedidos en tiempo real',
      'Mesas ilimitadas',
      'Usuarios ilimitados',
      'Productos ilimitados',
      'Cajas ilimitadas',
      'Inventario ilimitado',
      'Reportes + exportar',
      'Soporte prioritario',
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
            <p className="text-gold-muted text-xs tracking-[4px] uppercase mb-3">Planes</p>
            <h2 className="font-display text-3xl md:text-4xl font-light text-white mb-2">
              Gratis durante el lanzamiento
            </h2>
            <p className="text-silver-muted text-sm mb-6">Acceso completo sin costo. Los planes aplican próximamente.</p>

            {/* Toggle mensual/anual */}
            <div className="inline-flex items-center gap-3 bg-tonalli-black-card border border-subtle rounded-full px-4 py-2">
              <span className={`text-sm ${!annual ? 'text-gold' : 'text-silver-muted'}`}>Mensual</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-11 h-6 rounded-full transition-colors ${annual ? 'bg-gold' : 'bg-white/10'}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${annual ? 'translate-x-5' : ''}`}
                />
              </button>
              <span className={`text-sm ${annual ? 'text-gold' : 'text-silver-muted'}`}>
                Anual <span className="text-jade text-xs">-20%</span>
              </span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                custom={i + 1}
                className={`relative bg-tonalli-black-card border rounded-2xl p-6 ${
                  plan.popular ? 'border-gold/40' : 'border-subtle'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-tonalli-black text-xs font-semibold px-4 py-1 rounded-full">
                    Más popular
                  </div>
                )}
                {plan.popular && (
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-gold/10 to-transparent opacity-50 pointer-events-none" />
                )}

                <div className="relative">
                  <h3 className="text-white text-lg font-medium mb-4">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="font-display text-4xl text-gold font-light">
                      ${annual ? Math.round(plan.yearlyPrice / 12).toLocaleString() : plan.monthlyPrice}
                    </span>
                    <span className="text-silver-muted text-sm ml-2">/ mes</span>
                    {annual && (
                      <p className="text-jade text-xs mt-1">${plan.yearlyPrice.toLocaleString()} MXN al año</p>
                    )}
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-2.5">
                        <Check size={14} className="text-jade shrink-0" />
                        <span className="text-silver text-sm">{f}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/register"
                    className={`block w-full py-3 rounded-xl text-center font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-gold hover:bg-gold-light text-tonalli-black'
                        : 'border border-gold/30 text-gold hover:bg-gold/10'
                    }`}
                  >
                    Comenzar gratis
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
