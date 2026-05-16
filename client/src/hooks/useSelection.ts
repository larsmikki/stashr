import { useCallback, useState } from 'react';

// Lightweight selection state. Selection mode is "on" whenever at least one
// item is selected; pages can also force it via the toggle in the action bar.
export function useSelection() {
  const [ids, setIds] = useState<Set<number>>(() => new Set());
  const active = ids.size > 0;

  const toggle = useCallback((id: number) => {
    setIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectMany = useCallback((newIds: number[]) => {
    setIds(prev => {
      const next = new Set(prev);
      for (const id of newIds) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setIds(new Set()), []);

  return { ids, active, toggle, selectMany, clear };
}
