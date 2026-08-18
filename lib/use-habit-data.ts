"use client";

import { useCallback, useEffect, useState } from "react";
import { HabitType, todayISO, isoDateDaysAgo } from "@/lib/habits";
import { addEntry, fetchEntries, fetchGoals, setGoal, type Entry } from "@/lib/api-client";

const HISTORY_DAYS = 180;

export function useHabitData(habit: HabitType, defaultGoal: number) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goal, setGoalState] = useState<number>(defaultGoal);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entriesData, goalsData] = await Promise.all([
        fetchEntries({ habit, from: isoDateDaysAgo(HISTORY_DAYS - 1) }),
        fetchGoals(),
      ]);
      setEntries(entriesData);
      const g = goalsData.find((x) => x.habit === habit);
      setGoalState(g?.target ?? defaultGoal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [habit, defaultGoal]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    load();
  }, [load]);

  const today = todayISO();
  const todayValue = entries.find((e) => e.date === today)?.value ?? 0;

  const addDelta = useCallback(
    async (delta: number) => {
      const optimisticValue = Math.max(0, todayValue + delta);
      setEntries((prev) => {
        const others = prev.filter((e) => e.date !== today);
        return [...others, { habit, date: today, value: optimisticValue }];
      });
      try {
        const entry = await addEntry({ habit, date: today, delta });
        setEntries((prev) => {
          const others = prev.filter((e) => e.date !== today);
          return [...others, entry];
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
        load();
      }
    },
    [habit, today, todayValue, load]
  );

  const updateGoal = useCallback(
    async (target: number) => {
      setGoalState(target);
      try {
        await setGoal(habit, target);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
      }
    },
    [habit]
  );

  return { entries, goal, todayValue, loading, error, addDelta, updateGoal, reload: load };
}
