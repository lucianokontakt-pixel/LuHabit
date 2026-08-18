"use client";

import { useCallback, useEffect, useState } from "react";
import { HABIT_ORDER, HABITS, HabitType, todayISO, isoDateDaysAgo } from "@/lib/habits";
import { addEntry, fetchEntries, fetchGoals, type Entry } from "@/lib/api-client";

const HISTORY_DAYS = 180;

export function useAllHabitsData() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goals, setGoals] = useState<Record<HabitType, number>>(() => {
    const initial = {} as Record<HabitType, number>;
    for (const h of HABIT_ORDER) initial[h] = HABITS[h].defaultGoal;
    return initial;
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, goalsData] = await Promise.all([
        fetchEntries({ from: isoDateDaysAgo(HISTORY_DAYS - 1) }),
        fetchGoals(),
      ]);
      setEntries(entriesData);
      setGoals((prev) => {
        const next = { ...prev };
        for (const g of goalsData) next[g.habit] = g.target;
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    load();
  }, [load]);

  const today = todayISO();

  const entriesFor = useCallback(
    (habit: HabitType) => entries.filter((e) => e.habit === habit),
    [entries]
  );

  const todayValueFor = useCallback(
    (habit: HabitType) => entries.find((e) => e.habit === habit && e.date === today)?.value ?? 0,
    [entries, today]
  );

  const addDelta = useCallback(
    async (habit: HabitType, delta: number) => {
      const current = todayValueFor(habit);
      const optimisticValue = Math.max(0, current + delta);
      setEntries((prev) => {
        const others = prev.filter((e) => !(e.habit === habit && e.date === today));
        return [...others, { habit, date: today, value: optimisticValue }];
      });
      try {
        const entry = await addEntry({ habit, date: today, delta });
        setEntries((prev) => {
          const others = prev.filter((e) => !(e.habit === habit && e.date === today));
          return [...others, entry];
        });
      } catch {
        load();
      }
    },
    [today, todayValueFor, load]
  );

  return { entries, goals, loading, entriesFor, todayValueFor, addDelta, reload: load };
}
