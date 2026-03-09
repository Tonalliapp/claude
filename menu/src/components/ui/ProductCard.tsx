import { Plus } from 'lucide-react';
import type { MenuProduct } from '@/types';
import QuantityControl from './QuantityControl';

interface Props {
  product: MenuProduct;
  quantity: number;
  onAdd: () => void;
  onUpdateQuantity: (qty: number) => void;
  onTap?: () => void;
}

export default function ProductCard({ product, quantity, onAdd, onUpdateQuantity, onTap }: Props) {
  const unavailable = !product.available;

  return (
    <div
      className={`flex gap-3 p-3 rounded-xl border border-light-border bg-tonalli-black-card ${unavailable ? 'opacity-50' : ''} ${onTap ? 'cursor-pointer active:bg-tonalli-black-soft' : ''}`}
      onClick={onTap}
    >
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-20 h-20 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-white text-sm font-medium truncate">{product.name}</h3>
        {product.description && (
          <p className="text-silver-muted text-xs mt-0.5 line-clamp-2">{product.description}</p>
        )}
        <p className="text-gold font-semibold text-sm mt-1.5">${Number(product.price).toFixed(2)}</p>
      </div>
      <div className="flex items-end shrink-0" onClick={e => e.stopPropagation()}>
        {unavailable ? (
          <span className="text-silver-dark text-xs">No disponible</span>
        ) : quantity > 0 ? (
          <QuantityControl quantity={quantity} onChange={onUpdateQuantity} />
        ) : (
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/20 transition-colors"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
