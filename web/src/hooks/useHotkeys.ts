import { useEffect } from 'react';

type HotkeyMap = Record<string, () => void>;

/**
 * Registers keyboard shortcuts. Keys use format: "F1", "ctrl+n", "escape", etc.
 * Shortcuts are disabled when focus is inside an input/textarea/select.
 */
export function useHotkeys(map: HotkeyMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in form elements
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      parts.push(e.key.toLowerCase());
      const combo = parts.join('+');

      // Also try just the key (for F-keys, Escape, etc.)
      const justKey = e.key.toLowerCase();

      const action = map[combo] || map[justKey];
      if (action) {
        e.preventDefault();
        action();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [map]);
}
