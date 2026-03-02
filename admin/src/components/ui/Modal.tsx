import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={ref}
        className={`bg-tonalli-black-rich border border-gold-border rounded-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-light-border shrink-0">
          <h3 className="text-white text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="text-silver-dark hover:text-silver transition-colors" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
