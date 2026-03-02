import { motion } from 'framer-motion';

const steps = [
  { num: '01', title: 'Registra tu restaurante', desc: 'En menos de un minuto. Sin tarjeta de credito.' },
  { num: '02', title: 'Configura tu menu', desc: 'Agrega categorias, productos, precios e imagenes.' },
  { num: '03', title: 'Recibe pedidos', desc: 'Imprime los QR, ponlos en las mesas y listo.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 relative">
      {/* Jade accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-px bg-gradient-to-r from-jade to-gold opacity-30" />
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.p variants={fadeUp} custom={0} className="text-gold-muted text-xs tracking-[4px] uppercase mb-3">
            Asi de facil
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-4xl font-light text-white">
            Tres pasos para empezar
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative grid md:grid-cols-3 gap-8"
        >
          {/* Connecting line */}
          <div className="hidden md:block absolute top-[52px] left-[16.6%] right-[16.6%] h-px">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-gold/30 via-gold/50 to-gold/30 origin-left"
            />
          </div>

          {steps.map((s, i) => (
            <motion.div key={s.num} variants={fadeUp} custom={i} className="text-center relative">
              <div className="w-[72px] h-[72px] rounded-full border-2 border-gold/30 flex items-center justify-center mx-auto mb-5 bg-tonalli-black">
                <span className="text-gold font-display text-2xl font-light">{s.num}</span>
              </div>
              <h3 className="text-white text-lg font-medium mb-2">{s.title}</h3>
              <p className="text-silver-muted text-sm">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
