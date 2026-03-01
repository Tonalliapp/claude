import { QrCode } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-tonalli-black flex items-center justify-center p-6">
      <div className="text-center max-w-xs">
        <QrCode size={48} className="text-silver-dark mx-auto mb-4" />
        <p className="text-white text-lg font-medium mb-2">Página no encontrada</p>
        <p className="text-silver-muted text-sm">Intenta escanear el QR de nuevo.</p>
      </div>
    </div>
  );
}
