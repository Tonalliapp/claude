import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, UtensilsCrossed, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { useTableInfo } from '@/hooks/useMenu';
import { useCallWaiter } from '@/hooks/useOrders';
import StatusBanner from '@/components/ui/StatusBanner';

export default function WelcomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { slug, mesa, setSession, activeOrderId } = useCart();
  const mesaNum = mesa || parseInt(searchParams.get('mesa') || '0', 10);

  const { data, isLoading, error } = useTableInfo(slug, mesaNum);
  const callWaiter = useCallWaiter();

  useEffect(() => {
    if (data) {
      setSession(data.restaurant, data.table);
    }
  }, [data, setSession]);

  const handleCallWaiter = () => {
    callWaiter.mutate(
      { slug, tableNumber: mesaNum, reason: 'Asistencia solicitada desde mesa reservada' },
      {
        onSuccess: (res) => toast.success(res.message),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const goToMenu = () => navigate(`/${slug}/menu?mesa=${mesaNum}`);
  const goToOrder = () => navigate(`/${slug}/order/${activeOrderId}?mesa=${mesaNum}`);

  if (!mesaNum) {
    return (
      <div className="min-h-screen bg-tonalli-black flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-white text-lg font-medium mb-2">Mesa no especificada</p>
          <p className="text-silver-muted text-sm">Escanea el QR de tu mesa para continuar.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tonalli-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-tonalli-black flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-white text-lg font-medium mb-2">No pudimos encontrar esta mesa</p>
          <p className="text-silver-muted text-sm">Verifica que el QR sea correcto o pide ayuda al personal.</p>
        </div>
      </div>
    );
  }

  const { restaurant, table } = data;
  const status = table.status;

  return (
    <div className="min-h-screen bg-tonalli-black flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center w-full max-w-sm"
      >
        {restaurant.logoUrl ? (
          <img src={restaurant.logoUrl} alt={restaurant.name} className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-tonalli-black-card border border-gold/20 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={32} className="text-gold" />
          </div>
        )}

        <h1 className="text-white text-2xl font-display font-light tracking-wide mb-1">{restaurant.name}</h1>
        <p className="text-gold text-sm font-medium mb-6">Mesa {table.number}</p>

        <div className="mb-6">
          <StatusBanner status={status} />
        </div>

        <div className="flex flex-col gap-3">
          {status === 'reserved' ? (
            <button
              onClick={handleCallWaiter}
              disabled={callWaiter.isPending}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border border-red-500/30 text-red-400 font-medium text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Bell size={16} />
              {callWaiter.isPending ? 'Llamando...' : 'Llamar Mesero'}
            </button>
          ) : (
            <>
              <button
                onClick={goToMenu}
                className="w-full py-4 rounded-2xl bg-gold text-tonalli-black font-semibold text-sm shadow-lg shadow-gold/20"
              >
                Ver Menú
              </button>

              {(status === 'ordering' || activeOrderId) && (
                <button
                  onClick={goToOrder}
                  className="w-full py-4 rounded-2xl border border-jade/30 text-jade-light font-medium text-sm hover:bg-jade/10 transition-colors"
                >
                  Ver Pedido
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
