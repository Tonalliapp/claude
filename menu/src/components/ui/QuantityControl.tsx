import { Minus, Plus } from 'lucide-react';

interface Props {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'lg';
}

export default function QuantityControl({ quantity, onChange, min = 0, max = 10, size = 'sm' }: Props) {
  const btnSize = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const iconSize = size === 'lg' ? 18 : 14;
  const textSize = size === 'lg' ? 'text-base w-6' : 'text-sm w-5';

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= min}
        className={`${btnSize} rounded-full border border-light-border flex items-center justify-center text-silver-muted hover:text-white hover:border-silver disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <Minus size={iconSize} />
      </button>
      <span className={`text-white font-medium ${textSize} text-center`}>{quantity}</span>
      <button
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= max}
        className={`${btnSize} rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <Plus size={iconSize} />
      </button>
    </div>
  );
}
