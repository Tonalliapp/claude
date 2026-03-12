import { useRef, useEffect, useState } from 'react';

interface Props {
  categories: { id: string; name: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function CategoryPills({ categories, activeId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const check = () => setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 10);
    check();
    el.addEventListener('scroll', check, { passive: true });
    return () => el.removeEventListener('scroll', check);
  }, [categories]);

  return (
    <div className="relative sticky top-0 z-20">
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-tonalli-black to-transparent z-10 pointer-events-none" />
      )}
    <div
      ref={containerRef}
      className="flex gap-2 overflow-x-auto py-3 px-4 bg-tonalli-black/95 backdrop-blur-sm scrollbar-hide"
    >
      {categories.map(cat => {
        const isActive = cat.id === activeId;
        return (
          <button
            key={cat.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(cat.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
              isActive
                ? 'bg-gold text-tonalli-black'
                : 'bg-tonalli-black-card border border-light-border text-silver-muted hover:text-white'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
    </div>
  );
}
