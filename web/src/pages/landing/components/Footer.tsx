import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import TonalliLogo from '../../../components/TonalliLogo';

export default function Footer() {
  return (
    <footer className="border-t border-subtle py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <TonalliLogo size={22} />
              <span className="font-display text-gold text-lg tracking-[4px] font-light">TONALLI</span>
            </div>
            <p className="text-silver-dark text-xs mt-1 leading-relaxed">
              Gestion integral para restaurantes. Hecho con energia vital en Mexico.
            </p>
          </div>

          {/* Producto */}
          <div>
            <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">PRODUCTO</p>
            <div className="space-y-2">
              <a href="#features" className="block text-silver-dark text-sm hover:text-silver transition-colors">Funciones</a>
              <a href="#pricing" className="block text-silver-dark text-sm hover:text-silver transition-colors">Precio</a>
              <Link to="/register" className="block text-silver-dark text-sm hover:text-silver transition-colors">Registro</Link>
            </div>
          </div>

          {/* Empresa */}
          <div>
            <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">EMPRESA</p>
            <div className="space-y-2">
              <span className="block text-silver-dark text-sm">Tonalli</span>
              <span className="block text-silver-dark text-sm">Tomatlan, Jalisco</span>
            </div>
          </div>

          {/* Contacto */}
          <div>
            <p className="text-gold-muted text-[10px] font-medium tracking-[2px] mb-3">CONTACTO</p>
            <div className="space-y-2">
              <a
                href="https://wa.me/525623655099"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-silver-dark text-sm hover:text-jade transition-colors"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
              <a href="mailto:hola@tonalli.app" className="block text-silver-dark text-sm hover:text-silver transition-colors">
                hola@tonalli.app
              </a>
            </div>
          </div>
        </div>

        {/* Divider gold-jade gradient */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent mb-6" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-silver-dark text-xs">&copy; 2026 Tonalli. Todos los derechos reservados.</p>
          <div className="flex gap-4 text-silver-dark text-xs">
            <Link to="/privacy" className="hover:text-silver transition-colors">Privacidad</Link>
            <Link to="/terms" className="hover:text-silver transition-colors">Términos</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
