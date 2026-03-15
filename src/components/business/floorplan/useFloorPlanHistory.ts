import { useState, useCallback, useRef } from 'react';

export interface HistoryEntry<T> {
  items: T[];
  description?: string;
}

export function useFloorPlanHistory<T>(initialItems: T[], maxHistory = 30) {
  const [past, setPast] = useState<HistoryEntry<T>[]>([]);
  const [future, setFuture] = useState<HistoryEntry<T>[]>([]);
  const currentRef = useRef<T[]>(initialItems);

  const pushState = useCallback((newItems: T[], description?: string) => {
    setPast(prev => {
      const next = [...prev, { items: currentRef.current, description }];
      if (next.length > maxHistory) next.shift();
      return next;
    });
    setFuture([]);
    currentRef.current = newItems;
  }, [maxHistory]);

  const undo = useCallback((): T[] | null => {
    if (past.length === 0) return null;
    const prev = [...past];
    const lastState = prev.pop()!;
    setPast(prev);
    setFuture(f => [...f, { items: currentRef.current }]);
    currentRef.current = lastState.items;
    return lastState.items;
  }, [past]);

  const redo = useCallback((): T[] | null => {
    if (future.length === 0) return null;
    const fut = [...future];
    const nextState = fut.pop()!;
    setFuture(fut);
    setPast(p => [...p, { items: currentRef.current }]);
    currentRef.current = nextState.items;
    return nextState.items;
  }, [future]);

  const reset = useCallback((items: T[]) => {
    currentRef.current = items;
    setPast([]);
    setFuture([]);
  }, []);

  return {
    pushState,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
