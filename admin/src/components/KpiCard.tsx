import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
}

export default function KpiCard({ label, value, icon, trend }: KpiCardProps) {
  return (
    <div className="bg-tonalli-black-card border border-gold-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-silver-muted text-xs font-medium tracking-wider uppercase">{label}</span>
        <div className="text-gold">{icon}</div>
      </div>
      <p className="text-white text-2xl font-semibold">{value}</p>
      {trend && <p className="text-jade text-xs mt-1">{trend}</p>}
    </div>
  );
}
