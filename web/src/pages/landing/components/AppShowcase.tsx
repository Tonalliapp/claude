import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ChefHat, LayoutDashboard } from 'lucide-react';

const panels = [
  {
    id: 'menu',
    icon: Smartphone,
    label: 'Menu Digital',
    desc: 'Tus clientes escanean el QR y piden desde su celular',
    mockup: (
      <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 max-w-[260px] mx-auto">
        <div className="text-center mb-4">
          <p className="text-gold font-display text-sm tracking-[3px]">LA COCINA DE MARIA</p>
          <div className="w-8 h-px bg-gold/30 mx-auto mt-1.5" />
        </div>
        <div className="space-y-2">
          {['Tacos al Pastor', 'Guacamole', 'Agua de Jamaica'].map((item, i) => (
            <div key={i} className="flex justify-between items-center bg-tonalli-black-soft rounded-lg px-3 py-2">
              <span className="text-silver text-xs">{item}</span>
              <span className="text-gold text-xs font-medium">${[45, 65, 35][i]}</span>
            </div>
          ))}
        </div>
        <button className="w-full mt-3 bg-jade/20 text-jade text-xs font-medium py-2 rounded-lg">
          Pedir ahora
        </button>
      </div>
    ),
  },
  {
    id: 'kitchen',
    icon: ChefHat,
    label: 'Cocina',
    desc: 'Tu cocina recibe pedidos al instante y marca items listos',
    mockup: (
      <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 max-w-[320px] mx-auto">
        <p className="text-gold-muted text-[9px] tracking-[2px] mb-3">PEDIDOS ACTIVOS</p>
        <div className="space-y-2">
          {[
            { mesa: 'Mesa 3', items: ['2x Tacos', '1x Quesadilla'], status: 'Preparando' },
            { mesa: 'Mesa 7', items: ['1x Enchiladas'], status: 'Nuevo' },
          ].map((o, i) => (
            <div key={i} className="bg-tonalli-black-soft rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-white text-xs font-medium">{o.mesa}</span>
                <span className={`text-[10px] font-medium ${i === 0 ? 'text-gold' : 'text-jade'}`}>{o.status}</span>
              </div>
              {o.items.map((it, j) => (
                <div key={j} className="flex items-center gap-2 ml-1">
                  <div className={`w-2 h-2 rounded-full ${j === 0 && i === 0 ? 'bg-jade' : 'bg-silver-dark'}`} />
                  <span className="text-silver text-[11px]">{it}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    desc: 'Metricas, reportes y control total desde un solo lugar',
    mockup: (
      <div className="bg-tonalli-black-card border border-subtle rounded-2xl p-4 max-w-[340px] mx-auto">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-tonalli-black-soft rounded-lg p-2.5">
            <p className="text-gold-muted text-[8px] tracking-wider">VENTAS</p>
            <p className="text-gold text-lg font-semibold">$8.2k</p>
          </div>
          <div className="bg-tonalli-black-soft rounded-lg p-2.5">
            <p className="text-gold-muted text-[8px] tracking-wider">PEDIDOS</p>
            <p className="text-white text-lg font-semibold">32</p>
          </div>
        </div>
        {/* Chart mockup */}
        <div className="bg-tonalli-black-soft rounded-lg p-3">
          <p className="text-gold-muted text-[8px] tracking-wider mb-2">VENTAS POR HORA</p>
          <div className="flex items-end gap-1 h-12">
            {[30, 50, 45, 70, 90, 65, 80, 55].map((h, i) => (
              <div key={i} className="flex-1 bg-gold/20 rounded-t" style={{ height: `${h}%` }}>
                <div className="w-full bg-gold/40 rounded-t" style={{ height: '40%' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export default function AppShowcase() {
  const [active, setActive] = useState('menu');
  const activePanel = panels.find(p => p.id === active)!;

  return (
    <section className="py-24 px-6 border-y border-subtle">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-gold-muted text-xs tracking-[4px] uppercase mb-3">Asi se ve</p>
          <h2 className="font-display text-3xl md:text-4xl font-light text-white">
            Tu restaurante en accion
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-10">
          {panels.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active === p.id
                    ? 'bg-gold/15 text-gold border border-gold/30'
                    : 'text-silver-dark hover:text-silver border border-transparent'
                }`}
              >
                <Icon size={16} />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white text-xl font-medium mb-3">{activePanel.label}</h3>
            <p className="text-silver-muted text-base">{activePanel.desc}</p>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {activePanel.mockup}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
