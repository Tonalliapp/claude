import type { TableStatus } from '@/types';

const BANNER_CONFIG: Record<string, { bg: string; border: string; text: string; message: string } | null> = {
  free: null,
  reserved: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    message: 'Esta mesa está reservada. Solicita asistencia al personal.',
  },
  occupied: {
    bg: 'bg-gold/[0.06]',
    border: 'border-gold/20',
    text: 'text-gold-light',
    message: 'Mesa en servicio',
  },
  ordering: {
    bg: 'bg-jade/[0.06]',
    border: 'border-jade/20',
    text: 'text-jade-light',
    message: 'Pedido en curso',
  },
  bill: {
    bg: 'bg-silver/[0.06]',
    border: 'border-silver/20',
    text: 'text-silver',
    message: 'Cuenta solicitada',
  },
};

export default function StatusBanner({ status }: { status: TableStatus }) {
  const config = BANNER_CONFIG[status];
  if (!config) return null;

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl px-4 py-3`}>
      <p className={`${config.text} text-sm text-center font-medium`}>{config.message}</p>
    </div>
  );
}
