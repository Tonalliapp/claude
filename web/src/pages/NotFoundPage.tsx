import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-tonalli-black flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-gold text-8xl font-display font-light mb-4">404</p>
        <h1 className="text-white text-xl font-medium mb-2">Página no encontrada</h1>
        <p className="text-silver-muted text-sm mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold text-gold text-sm font-medium hover:bg-gold/10 transition-colors"
          >
            <ArrowLeft size={14} />
            Regresar
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-tonalli-black text-sm font-semibold hover:bg-gold-light transition-colors"
          >
            <Home size={14} />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
