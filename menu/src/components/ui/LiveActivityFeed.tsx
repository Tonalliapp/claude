import { CheckCircle, Flame, ChefHat, PartyPopper, Utensils } from 'lucide-react';
import type { LiveEvent } from '@/context/SocketContext';

const ICON_MAP: Record<LiveEvent['icon'], { Icon: typeof CheckCircle; color: string }> = {
  confirm: { Icon: CheckCircle, color: 'text-gold' },
  cook: { Icon: ChefHat, color: 'text-amber-400' },
  ready: { Icon: PartyPopper, color: 'text-jade-light' },
  deliver: { Icon: Utensils, color: 'text-jade' },
  item: { Icon: Flame, color: 'text-silver' },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function LiveActivityFeed({ events }: { events: LiveEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-silver-dark text-xs">Esperando actividad...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event, i) => {
        const { Icon, color } = ICON_MAP[event.icon] ?? ICON_MAP.item;
        const isLatest = i === 0;
        return (
          <div
            key={event.id}
            className={`flex items-start gap-3 transition-all duration-500 ${isLatest ? 'animate-fade-in' : 'opacity-60'}`}
          >
            <div className={`mt-0.5 shrink-0 ${color}`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${isLatest ? 'text-white' : 'text-silver-muted'}`}>
                {event.message}
              </p>
            </div>
            <span className="text-[10px] text-silver-dark shrink-0 mt-0.5">
              {formatTime(event.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
