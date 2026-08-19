"use client";

import { useCallback, useEffect, useState } from "react";
import { HabitType, todayISO, isoDateDaysAgo } from "@/lib/habits";
import { addEntry, fetchEntries, fetchGoals, setGoal, type Entry } from "@/lib/api-client";

const HISTORY_DAYS = 180;

export function useHabitData(habit: HabitType, defaultGoal: number) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goal, setGoalState] = useState<number>(defaultGoal);
  const [weeklyGoal, setWeeklyGoalState] = useState<number | undefined>(undefined);
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
      setWeeklyGoalState(g?.weeklyTarget ?? undefined);
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
  /**
   * Frühester nachtragbarer Tag. Weiter zurück liegen keine Einträge im
   * Speicher — ein Wert dort würde von 0 aus gerechnet und könnte einen
   * echten Eintrag überschreiben.
   */
  const earliestDate = isoDateDaysAgo(HISTORY_DAYS - 1);

  const valueFor = (date: string) => entries.find((e) => e.date === date)?.value ?? 0;
  const todayValue = valueFor(today);

  /**
   * Schreibt den Eintrag eines Tages und hält die Liste optimistisch aktuell.
   * Der Vorschauwert wird aus der vorigen Liste berechnet statt aus dem
   * Closure — sonst rechnen mehrere schnelle Taps alle vom selben Stand aus.
   */
  const write = useCallback(
    async (
      date: string,
      optimistic: (current: number) => number,
      params: { delta?: number; value?: number }
    ) => {
      const replace = (list: Entry[], entry: Entry) => [
        ...list.filter((e) => e.date !== date),
        entry,
      ];
      setEntries((prev) => {
        const current = prev.find((e) => e.date === date)?.value ?? 0;
        return replace(prev, { habit, date, value: Math.max(0, optimistic(current)) });
      });
      try {
        const entry = await addEntry({ habit, date, ...params });
        setEntries((prev) => replace(prev, entry));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
        load();
      }
    },
    [habit, load]
  );

  const addDelta = useCallback(
    async (delta: number, date: string = today) => {
      await write(date, (current) => current + delta, { delta });
    },
    [today, write]
  );

  /** Genauen Wert setzen — geht direkt über value, nicht über die Differenz. */
  const setValueFor = useCallback(
    async (value: number, date: string = today) => {
      const safe = Math.max(0, value);
      await write(date, () => safe, { value: safe });
    },
    [today, write]
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

  const updateWeeklyGoal = useCallback(
    async (weekly: number | null) => {
      setWeeklyGoalState(weekly ?? undefined);
      try {
        await setGoal(habit, goal, weekly);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
      }
    },
    [habit, goal]
  );

  return {
    entries,
    goal,
    weeklyGoal,
    todayValue,
    valueFor,
    today,
    earliestDate,
    loading,
    error,
    addDelta,
    setValueFor,
    updateGoal,
    updateWeeklyGoal,
    reload: load,
  };
}
