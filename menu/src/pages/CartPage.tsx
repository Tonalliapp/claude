import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { useCreateOrder } from '@/hooks/useOrders';
import QuantityControl from '@/components/ui/QuantityControl';

export default function CartPage() {
  const navigate = useNavigate();
  const { slug, mesa, items, updateQuantity, updateItemNotes, clearCart, totalPrice, setActiveOrderId } = useCart();
  const createOrder = useCreateOrder();
  const [globalNotes, setGlobalNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = () => {
    if (items.length === 0) return;

    const payload = {
      slug,
      tableNumber: mesa,
      items: items.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
        ...(i.notes ? { notes: i.notes } : {}),
      })),
      ...(globalNotes.trim() ? { notes: globalNotes.trim() } : {}),
    };

    createOrder.mutate(payload, {
      onSuccess: (order) => {
        setActiveOrderId(order.id);
        clearCart();
        toast.success('Pedido enviado');
        navigate(`/${slug}/order/${order.id}?mesa=${mesa}`);
      },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-tonalli-black flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={() => navigate(-1)} className="text-silver-muted hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-white text-base font-medium">Carrito</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <ShoppingBag size={48} className="text-silver-dark mb-4" />
          <p className="text-white font-medium mb-1">Tu carrito está vacío</p>
          <p className="text-silver-muted text-sm mb-4">Agrega productos desde el menú</p>
          <button
            onClick={() => navigate(`/${slug}/menu?mesa=${mesa}`)}
            className="px-6 py-3 rounded-xl border border-gold text-gold text-sm font-medium hover:bg-gold/10 transition-colors"
          >
            Ver Menú
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tonalli-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="text-silver-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-base font-medium">Tu Pedido</h1>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-3 mt-2">
          {items.map(item => (
            <div key={item.product.id} className="bg-tonalli-black-card border border-light-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                  <p className="text-gold text-sm font-semibold mt-0.5">${(Number(item.product.price) * item.quantity).toFixed(2)}</p>
                </div>
                <QuantityControl quantity={item.quantity} onChange={(qty) => updateQuantity(item.product.id, qty)} />
              </div>
              <input
                type="text"
                placeholder="Notas (sin cebolla, etc.)"
                value={item.notes || ''}
                onChange={(e) => updateItemNotes(item.product.id, e.target.value)}
                className="w-full bg-tonalli-black border border-light-border rounded-lg px-3 py-2 text-white text-xs placeholder:text-silver-dark focus:outline-none focus:border-gold/30"
              />
            </div>
          ))}
        </div>

        {/* Global notes */}
        <div className="mt-4">
          <label className="text-gold-muted text-[10px] font-medium tracking-[2px] block mb-1.5">
            NOTAS PARA EL RESTAURANTE
          </label>
          <textarea
            placeholder="Instrucciones especiales..."
            value={globalNotes}
            onChange={(e) => setGlobalNotes(e.target.value)}
            rows={2}
            className="w-full bg-tonalli-black-card border border-light-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-silver-dark focus:outline-none focus:border-gold/30 resize-none"
          />
        </div>

        {/* Total */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-light-border">
          <span className="text-silver-muted text-sm">Total</span>
          <span className="text-gold text-xl font-bold">${totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Submit */}
      <div className="p-4 border-t border-light-border">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={createOrder.isPending}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gold text-tonalli-black font-semibold text-sm shadow-lg shadow-gold/20 disabled:opacity-50"
        >
          <ShoppingBag size={16} />
          Revisar y Enviar · ${totalPrice.toFixed(2)}
        </button>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowConfirm(false)}>
          <div
            className="w-full max-w-lg bg-tonalli-black-card border-t border-gold-border rounded-t-3xl p-5 pb-8 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-gold" />
              </div>
              <div>
                <p className="text-white text-base font-semibold">Confirmar pedido</p>
                <p className="text-silver-muted text-xs">Mesa {mesa} · {items.length} {items.length === 1 ? 'producto' : 'productos'}</p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto mb-4">
              {items.map(item => (
                <div key={item.product.id} className="flex justify-between items-center px-1">
                  <span className="text-silver text-sm">{item.quantity}x {item.product.name}</span>
                  <span className="text-silver-muted text-sm">${(Number(item.product.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center py-3 border-t border-light-border mb-4">
              <span className="text-white text-sm font-medium">Total</span>
              <span className="text-gold text-xl font-bold">${totalPrice.toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-xl border border-light-border text-silver text-sm font-medium"
              >
                Modificar
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSubmit(); }}
                disabled={createOrder.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gold text-tonalli-black font-semibold text-sm disabled:opacity-50"
              >
                {createOrder.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
                {createOrder.isPending ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
