import { ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  totalItems: number;
  totalPrice: number;
  onClick: () => void;
}

export default function CartBar({ totalItems, totalPrice, onClick }: Props) {
  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-30"
        >
          <button
            onClick={onClick}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-gold text-tonalli-black font-semibold shadow-lg shadow-gold/20"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag size={18} />
              <span className="text-sm">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</span>
            </div>
            <span className="text-sm font-bold">${totalPrice.toFixed(2)}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
