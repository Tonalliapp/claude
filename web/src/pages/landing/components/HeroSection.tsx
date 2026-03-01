import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const subtitles = [
  'Pedidos en tiempo real',
  'Menu digital con QR',
  'Cocina conectada',
  'Punto de venta integrado',
  'Reportes al instante',
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(i => (i + 1) % subtitles.length), 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center px-6 pt-20 overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-jade/5 blur-[120px]" />
        {/* Particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gold/30"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Text */}
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-gold-muted text-xs tracking-[6px] uppercase mb-6"
          >
            Energia vital en cada mesa
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-5xl md:text-6xl lg:text-7xl font-light text-white leading-tight mb-4"
          >
            Tu restaurante,{' '}
            <span className="text-gold">elevado</span>
          </motion.h1>

          <div className="h-8 mb-8">
            <AnimatePresence mode="wait">
              <motion.p
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-silver-muted text-lg md:text-xl"
              >
                {subtitles[current]}
              </motion.p>
            </AnimatePresence>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-silver-dark text-base mb-10 max-w-lg"
          >
            Gestion integral para tu restaurante. Menu digital, pedidos, cocina, caja, inventario y reportes. Todo en un solo lugar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-tonalli-black px-8 py-3.5 rounded-xl text-base font-semibold transition-colors"
            >
              Empezar gratis
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 border border-gold/30 text-gold hover:border-gold px-8 py-3.5 rounded-xl text-base font-medium transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </motion.div>
        </div>

        {/* Right: Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="hidden lg:block"
        >
          <div className="relative">
            {/* Glow behind */}
            <div className="absolute -inset-4 bg-gold/5 rounded-3xl blur-2xl" />

            {/* Mockup frame */}
            <div className="relative bg-tonalli-black-card border border-gold-border/30 rounded-2xl overflow-hidden shadow-2xl">
              {/* Title bar */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-light-border">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-gold/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-jade/60" />
                <span className="ml-3 text-silver-dark text-[10px]">tonalli.app/dashboard</span>
              </div>

              {/* Dashboard content mockup */}
              <div className="p-5 space-y-4">
                {/* Metric cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-tonalli-black-soft rounded-xl p-3">
                    <p className="text-gold-muted text-[8px] tracking-wider mb-1">VENTAS HOY</p>
                    <p className="text-gold text-xl font-semibold">$12.4k</p>
                  </div>
                  <div className="bg-tonalli-black-soft rounded-xl p-3">
                    <p className="text-gold-muted text-[8px] tracking-wider mb-1">PEDIDOS</p>
                    <p className="text-white text-xl font-semibold">47</p>
                  </div>
                  <div className="bg-tonalli-black-soft rounded-xl p-3">
                    <p className="text-gold-muted text-[8px] tracking-wider mb-1">MESAS</p>
                    <p className="text-jade text-xl font-semibold">6/8</p>
                  </div>
                </div>

                {/* Orders list mockup */}
                <div className="space-y-2">
                  {[
                    { mesa: 'Mesa 3', items: '2 items', status: 'Preparando', color: 'text-gold' },
                    { mesa: 'Mesa 7', items: '4 items', status: 'Listo', color: 'text-jade' },
                    { mesa: 'Mesa 1', items: '1 item', status: 'Nuevo', color: 'text-silver' },
                  ].map((o, i) => (
                    <div key={i} className="flex items-center justify-between bg-tonalli-black-soft rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-white text-xs font-medium">{o.mesa}</p>
                        <p className="text-silver-dark text-[10px]">{o.items}</p>
                      </div>
                      <span className={`text-[10px] font-medium ${o.color}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
