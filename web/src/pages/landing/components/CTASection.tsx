import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import TonalliLogo from '../../../components/TonalliLogo';

export default function CTASection() {
  return (
    <section className="py-24 px-6 relative">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-gold/3 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <div className="flex justify-center mb-6">
          <TonalliLogo size={48} animated />
        </div>
        {/* Gold-jade divider */}
        <div className="w-16 h-px mx-auto mb-8 bg-gradient-to-r from-gold via-jade-muted to-gold opacity-40" />

        <h2 className="font-display text-3xl md:text-5xl font-light text-white mb-4">
          Listo para transformar{' '}
          <span className="bg-gradient-to-r from-gold-light via-gold to-jade-light bg-clip-text text-transparent">tu restaurante</span>?
        </h2>
        <p className="text-silver-muted text-base md:text-lg mb-10 max-w-xl mx-auto">
          Unete a los restaurantes que ya gestionan todo desde Tonalli. Configuracion en minutos, sin costo.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light hover:scale-105 text-tonalli-black px-10 py-4 rounded-xl text-lg font-semibold transition-all duration-300 shadow-lg shadow-gold/20 hover:shadow-gold/40"
        >
          Empezar ahora
          <ArrowRight size={20} />
        </Link>
      </motion.div>
    </section>
  );
}
