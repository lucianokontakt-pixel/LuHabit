"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "luhabit-card-order";

export function useCardOrder(defaultOrder: string[]) {
  const [customOrder, setCustomOrder] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- liest gespeicherte Reihenfolge einmalig beim Mount
      if (raw) setCustomOrder(JSON.parse(raw));
    } catch {
      // localStorage nicht verfügbar -> Standardreihenfolge behalten
    }
  }, []);

  const order = useMemo(
    () =>
      customOrder
        ? [
            ...customOrder.filter((id) => defaultOrder.includes(id)),
            ...defaultOrder.filter((id) => !customOrder.includes(id)),
          ]
        : defaultOrder,
    [customOrder, defaultOrder]
  );

  const persist = useCallback((next: string[]) => {
    setCustomOrder(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignorieren, wenn localStorage nicht verfügbar ist
    }
  }, []);

  const moveUp = useCallback(
    (id: string) => {
      const idx = order.indexOf(id);
      if (idx <= 0) return;
      const next = [...order];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      persist(next);
    },
    [order, persist]
  );

  const moveDown = useCallback(
    (id: string) => {
      const idx = order.indexOf(id);
      if (idx === -1 || idx >= order.length - 1) return;
      const next = [...order];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      persist(next);
    },
    [order, persist]
  );

  return { order, moveUp, moveDown };
}
