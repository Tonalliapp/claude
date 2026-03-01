import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="font-display text-3xl md:text-5xl font-light text-white mb-4">
          Listo para transformar{' '}
          <span className="text-gold">tu restaurante</span>?
        </h2>
        <p className="text-silver-muted text-base md:text-lg mb-10 max-w-xl mx-auto">
          Unete a los restaurantes que ya gestionan todo desde Tonalli. Configuracion en minutos, sin costo.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-tonalli-black px-10 py-4 rounded-xl text-lg font-semibold transition-colors animate-pulse hover:animate-none"
        >
          Empezar ahora
          <ArrowRight size={20} />
        </Link>
      </motion.div>
    </section>
  );
}
