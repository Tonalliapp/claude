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

function AnimatedSun() {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  const leaves = [15, 105, 195, 285];
  const diamonds = [0, 90, 180, 270];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="relative w-[140px] h-[140px] md:w-[170px] md:h-[170px] mx-auto mb-8"
    >
      {/* Breathing glow */}
      <motion.div
        className="absolute inset-[-30px] rounded-full bg-gold/5 blur-[40px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg viewBox="0 0 200 200" fill="none" className="w-full h-full relative z-10">
        <defs>
          <radialGradient id="hero-sun-core" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#E2C97E" />
            <stop offset="50%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#9A7B2F" />
          </radialGradient>
        </defs>

        {/* Outer silver ring */}
        <circle cx="100" cy="100" r="60" stroke="#C0C0C0" strokeWidth="0.5" opacity="0.06" />
        {/* Jade ring */}
        <circle cx="100" cy="100" r="50" stroke="#4A8C6F" strokeWidth="0.8" opacity="0.15" />
        {/* Gold ring */}
        <circle cx="100" cy="100" r="40" stroke="#C9A84C" strokeWidth="1" opacity="0.25" />

        {/* 12 Ray lines */}
        <g stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
          {rays.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 100 + Math.sin(rad) * 35;
            const y1 = 100 - Math.cos(rad) * 35;
            const x2 = 100 + Math.sin(rad) * 55;
            const y2 = 100 - Math.cos(rad) * 55;
            return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>

        {/* 4 Jade leaf accents */}
        <g fill="#4A8C6F" opacity="0.35">
          {leaves.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const cx = 100 + Math.sin(rad) * 48;
            const cy = 100 - Math.cos(rad) * 48;
            return <ellipse key={angle} cx={cx} cy={cy} rx="2" ry="4" transform={`rotate(${angle} ${cx} ${cy})`} />;
          })}
        </g>

        {/* 4 Gold diamond rays at cardinal points */}
        <g fill="#C9A84C" opacity="0.7">
          {diamonds.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const cx = 100 + Math.sin(rad) * 72;
            const cy = 100 - Math.cos(rad) * 72;
            const size = 4;
            return (
              <polygon
                key={angle}
                points={`${cx},${cy - size} ${cx + size * 0.75},${cy} ${cx},${cy + size} ${cx - size * 0.75},${cy}`}
              />
            );
          })}
        </g>

        {/* Sun core with inner glow */}
        <circle cx="100" cy="100" r="26" fill="url(#hero-sun-core)" />
        <circle cx="100" cy="100" r="26" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.3" />
      </svg>

      {/* Slow rotation overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
          <circle cx="100" cy="100" r="68" stroke="#C9A84C" strokeWidth="0.3" opacity="0.08" strokeDasharray="4 8" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

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
          {/* Animated Sun - mobile only, shows above text */}
          <div className="lg:hidden">
            <AnimatedSun />
          </div>

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
            <span className="bg-gradient-to-r from-gold-light via-gold to-jade-light bg-clip-text text-transparent">elevado</span>
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

        {/* Right: Dashboard mockup + animated sun */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="hidden lg:block"
        >
          <div className="relative">
            {/* Animated Sun - desktop, above the mockup */}
            <div className="mb-6">
              <AnimatedSun />
            </div>

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
