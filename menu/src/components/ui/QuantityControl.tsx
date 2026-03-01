import { Minus, Plus } from 'lucide-react';

interface Props {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
}

export default function QuantityControl({ quantity, onChange, min = 0 }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= min}
        className="w-8 h-8 rounded-full border border-light-border flex items-center justify-center text-silver-muted hover:text-white hover:border-silver disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="text-white font-medium text-sm w-5 text-center">{quantity}</span>
      <button
        onClick={() => onChange(quantity + 1)}
        className="w-8 h-8 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
