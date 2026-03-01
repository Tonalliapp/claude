import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-tonalli-black/90 backdrop-blur-xl border-b border-gold-border shadow-lg shadow-black/20'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-display text-gold text-xl tracking-[6px] font-light">TONALLI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <a href="#features" className="text-silver-muted hover:text-white text-sm transition-colors px-3 py-1.5">
            Funciones
          </a>
          <a href="#pricing" className="text-silver-muted hover:text-white text-sm transition-colors px-3 py-1.5">
            Precio
          </a>
          <Link to="/login" className="text-silver-muted hover:text-white text-sm transition-colors px-3 py-1.5">
            Iniciar Sesion
          </Link>
          <Link
            to="/register"
            className="bg-gold hover:bg-gold-light text-tonalli-black px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Registrar Restaurante
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-silver-muted p-1">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-tonalli-black-rich border-t border-gold-border px-6 pb-5 pt-2 space-y-3"
        >
          <a href="#features" onClick={() => setMobileOpen(false)} className="block text-silver-muted hover:text-white text-sm py-2 transition-colors">
            Funciones
          </a>
          <a href="#pricing" onClick={() => setMobileOpen(false)} className="block text-silver-muted hover:text-white text-sm py-2 transition-colors">
            Precio
          </a>
          <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-silver-muted hover:text-white text-sm py-2 transition-colors">
            Iniciar Sesion
          </Link>
          <Link
            to="/register"
            onClick={() => setMobileOpen(false)}
            className="block w-full bg-gold hover:bg-gold-light text-tonalli-black px-5 py-2.5 rounded-lg text-sm font-semibold text-center transition-colors"
          >
            Registrar Restaurante
          </Link>
        </motion.div>
      )}
    </motion.nav>
  );
}
