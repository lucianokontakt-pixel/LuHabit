"use client";

import { useCallback, useEffect, useState } from "react";
import { isoDateDaysAgo, todayISO } from "@/lib/habits";
import { addEntry, fetchEntries, type Entry } from "@/lib/api-client";

const HISTORY_DAYS = 365;

export function useMetricData(metric: string) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEntries({ habit: metric, from: isoDateDaysAgo(HISTORY_DAYS - 1) });
      setEntries([...data].sort((a, b) => a.date.localeCompare(b.date)));
    } finally {
      setLoading(false);
    }
  }, [metric]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    load();
  }, [load]);

  const addValue = useCallback(
    async (value: number, date: string = todayISO()) => {
      const entry = await addEntry({ habit: metric, date, value });
      setEntries((prev) => {
        const others = prev.filter((e) => e.date !== date);
        return [...others, entry].sort((a, b) => a.date.localeCompare(b.date));
      });
    },
    [metric]
  );

  return { entries, loading, addValue, reload: load };
}
