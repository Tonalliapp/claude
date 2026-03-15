import { useState } from 'react';
import { Plus, X, UtensilsCrossed } from 'lucide-react';
import type { MenuProduct } from '@/types';
import QuantityControl from './QuantityControl';

interface Props {
  product: MenuProduct;
  quantity: number;
  onAdd: () => void;
  onUpdateQuantity: (qty: number) => void;
  onClose: () => void;
}

export default function ProductDetailModal({ product, quantity, onAdd, onUpdateQuantity, onClose }: Props) {
  const unavailable = !product.available;
  const [imgError, setImgError] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-tonalli-black-card border-t border-gold-border rounded-t-3xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-silver-muted hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* Image */}
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-56 object-cover aspect-video"
            onError={() => setImgError(true)}
          />
        ) : product.imageUrl && imgError ? (
          <div className="w-full h-56 bg-tonalli-black-soft flex items-center justify-center">
            <UtensilsCrossed size={40} className="text-silver-dark" />
          </div>
        ) : null}

        {/* Content */}
        <div className="p-5">
          <h2 className="text-white text-xl font-medium mb-1">{product.name}</h2>
          <p className="text-gold text-lg font-semibold mb-3">
            ${Number(product.price).toFixed(2)}
          </p>

          {product.description && (
            <p className="text-silver-muted text-sm leading-relaxed mb-5">
              {product.description}
            </p>
          )}

          {unavailable ? (
            <div className="bg-tonalli-black-soft border border-light-border rounded-xl px-4 py-3 text-center">
              <span className="text-silver-dark text-sm">No disponible por el momento</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {quantity > 0 ? (
                <>
                  <QuantityControl quantity={quantity} onChange={onUpdateQuantity} size="lg" />
                  <span className="text-silver-muted text-sm">
                    Subtotal: <span className="text-gold font-semibold">${(Number(product.price) * quantity).toFixed(2)}</span>
                  </span>
                </>
              ) : (
                <button
                  onClick={() => { onAdd(); onClose(); }}
                  className="w-full bg-gold text-tonalli-black py-3 rounded-xl text-sm font-semibold hover:bg-gold-light transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Agregar al pedido
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
