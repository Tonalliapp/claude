const STATUS_STYLES: Record<string, string> = {
  active: 'bg-jade-glow text-jade',
  suspended: 'bg-status-pending text-gold',
  cancelled: 'bg-red-500/10 text-red-400',
  // order statuses
  pending: 'bg-status-pending text-gold',
  confirmed: 'bg-jade-glow text-jade',
  preparing: 'bg-status-preparing text-silver',
  ready: 'bg-status-ready text-jade-bright',
  delivered: 'bg-jade-glow text-jade',
  paid: 'bg-jade-glow text-jade-bright',
  // user statuses
  true: 'bg-jade-glow text-jade',
  false: 'bg-red-500/10 text-red-400',
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-tonalli-black-soft text-silver-muted';
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium capitalize ${style}`}>
      {status === 'true' ? 'Activo' : status === 'false' ? 'Inactivo' : status}
    </span>
  );
}
