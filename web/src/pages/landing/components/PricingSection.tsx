import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const pricingFeatures = [
  'Pedidos ilimitados',
  'Menu digital con QR',
  'Cocina en tiempo real',
  'Punto de venta',
  'Control de inventario',
  'Reportes y analytics',
  'Usuarios ilimitados',
  'Soporte por WhatsApp',
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
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
            <p className="text-gold-muted text-xs tracking-[4px] uppercase mb-3">Precio</p>
            <h2 className="font-display text-3xl md:text-4xl font-light text-white mb-2">
              Gratis durante el lanzamiento
            </h2>
            <p className="text-silver-muted text-sm">Acceso completo. Sin tarjeta. Sin limites.</p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={1}
            className="relative bg-tonalli-black-card border border-gold/20 rounded-2xl p-8"
          >
            {/* Subtle glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-gold/10 to-transparent opacity-50 pointer-events-none" />

            <div className="relative">
              <div className="text-center mb-6">
                <span className="font-display text-5xl text-gold font-light">$0</span>
                <span className="text-silver-muted text-sm ml-2">/ mes</span>
              </div>
              <div className="space-y-3 mb-8">
                {pricingFeatures.map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <Check size={16} className="text-jade shrink-0" />
                    <span className="text-silver text-sm">{f}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/register"
                className="block w-full bg-gold hover:bg-gold-light text-tonalli-black py-3.5 rounded-xl text-center font-semibold transition-colors"
              >
                Registrar mi restaurante
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
