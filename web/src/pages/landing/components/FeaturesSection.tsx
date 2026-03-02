import { motion } from 'framer-motion';
import {
  ClipboardList,
  QrCode,
  ChefHat,
  DollarSign,
  Package,
  BarChart3,
} from 'lucide-react';

const features = [
  { icon: ClipboardList, title: 'Pedidos en Tiempo Real', desc: 'Recibe y gestiona pedidos al instante. Sin papeles, sin errores.' },
  { icon: QrCode, title: 'Menu Digital + QR', desc: 'Cada mesa con su codigo QR. Tus clientes piden desde su celular.' },
  { icon: ChefHat, title: 'Cocina Conectada', desc: 'Tu cocina ve los pedidos al instante. Marcan items listos uno a uno.' },
  { icon: DollarSign, title: 'Punto de Venta', desc: 'Abre caja, cobra efectivo/tarjeta/transferencia, cierra turno.' },
  { icon: Package, title: 'Inventario', desc: 'Control de stock automatico. Alertas de producto bajo.' },
  { icon: BarChart3, title: 'Reportes', desc: 'Ventas por hora, productos top, rendimiento por mesero.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 border-t border-subtle relative">
      {/* Jade gradient accent at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-jade/20 to-transparent" />
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <motion.p variants={fadeUp} custom={0} className="text-gold-muted text-xs tracking-[4px] uppercase mb-3">
            Todo lo que necesitas
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-4xl font-light text-white">
            Una plataforma, todo tu restaurante
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-tonalli-black-card border border-subtle rounded-2xl p-6 hover:border-gold-border transition-colors group cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-gold-glow flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors">
                  <Icon size={20} className="text-gold" />
                </div>
                <h3 className="text-white text-base font-medium mb-2">{f.title}</h3>
                <p className="text-silver-muted text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
