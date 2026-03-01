import { Check } from 'lucide-react';
import type { OrderStatus } from '@/types';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Recibido' },
  { status: 'confirmed', label: 'Confirmado' },
  { status: 'preparing', label: 'Preparando' },
  { status: 'ready', label: 'Listo' },
  { status: 'delivered', label: 'Entregado' },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  delivered: 4,
  paid: 5,
  cancelled: -1,
};

export default function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = STATUS_ORDER[status] ?? 0;

  if (status === 'cancelled') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
        <p className="text-red-400 text-sm text-center font-medium">Pedido cancelado</p>
      </div>
    );
  }

  if (status === 'paid') {
    return (
      <div className="bg-jade/10 border border-jade/30 rounded-xl px-4 py-3">
        <p className="text-jade-light text-sm text-center font-medium">Pedido pagado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isUpcoming = i > currentIndex;

        return (
          <div key={step.status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  isDone
                    ? 'bg-jade text-white'
                    : isCurrent
                      ? 'bg-gold text-tonalli-black'
                      : 'bg-tonalli-black-card border border-light-border text-silver-dark'
                }`}
              >
                {isDone ? <Check size={14} /> : <span className="text-xs font-medium">{i + 1}</span>}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-0.5 h-6 ${isDone ? 'bg-jade/40' : 'bg-light-border'}`} />
              )}
            </div>
            <div className="pt-1">
              <p className={`text-sm font-medium ${
                isDone ? 'text-jade-light' : isCurrent ? 'text-gold' : 'text-silver-dark'
              }`}>
                {step.label}
              </p>
              {isCurrent && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  <span className="text-gold-muted text-xs">En curso</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
