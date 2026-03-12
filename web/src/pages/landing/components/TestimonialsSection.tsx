import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Roberto Hernandez',
    business: 'Taqueria El Fogon',
    type: 'Taqueria',
    text: 'Antes llevabamos todo en papel. Ahora los pedidos llegan directo a la cocina y no se pierde nada. Mis clientes aman el menu QR.',
    stars: 5,
  },
  {
    name: 'Ana Sofia Martinez',
    business: 'Restaurante La Terraza',
    type: 'Restaurante fino',
    text: 'Tonalli le da a mi restaurante la imagen profesional que buscaba. El dashboard me muestra todo lo que necesito para tomar decisiones.',
    stars: 5,
  },
  {
    name: 'Diego Ramirez',
    business: 'Cafe Central',
    type: 'Cafeteria',
    text: 'Lo instale en 10 minutos. El control de inventario me ahorra horas cada semana. Y lo mejor: es gratis.',
    stars: 5,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function TestimonialsSection() {
  return (
    <section className="py-24 px-6 border-t border-subtle">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.p variants={fadeUp} custom={0} className="text-gold-muted text-xs tracking-[4px] uppercase mb-3">
            Testimonios
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-4xl font-light text-white">
            Lo que dicen nuestros usuarios
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-5"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              custom={i}
              className="bg-tonalli-black-card border border-subtle rounded-2xl p-6 hover:border-gold-border hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex gap-0.5 mb-4" aria-label={`${t.stars} de 5 estrellas`}>
                {[...Array(t.stars)].map((_, j) => (
                  <Star key={j} size={14} className="text-gold fill-gold" aria-hidden="true" />
                ))}
              </div>
              <p className="text-silver text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div>
                <p className="text-white text-sm font-medium">{t.name}</p>
                <p className="text-silver-dark text-xs">{t.business} · {t.type}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
