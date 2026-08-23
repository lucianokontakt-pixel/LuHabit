"use client";

import { useCallback, useEffect, useState } from "react";
import { HabitType, todayISO, isoDateDaysAgo } from "@/lib/habits";
import {
  addEntry,
  fetchEntries,
  fetchGoals,
  getCachedEntries,
  getCachedGoals,
  type Entry,
} from "@/lib/api-client";

const HISTORY_DAYS = 180;

function initialGoals(): Record<string, number> {
  const cached = getCachedGoals();
  if (!cached) return {};
  const next: Record<string, number> = {};
  for (const g of cached) next[g.habit] = g.target;
  return next;
}

function initialWeeklyGoals(): Record<string, number | undefined> {
  const cached = getCachedGoals();
  if (!cached) return {};
  const next: Record<string, number | undefined> = {};
  for (const g of cached) next[g.habit] = g.weeklyTarget ?? undefined;
  return next;
}

export function useAllHabitsData() {
  // Aus dem Zwischenspeicher vorbefüllt — sonst blitzt jede Karte beim ersten
  // Rendern kurz bei 0 auf, bevor die echten Werte eine Zwischendurch-Sekunde
  // später ankommen.
  const earliestEntry = isoDateDaysAgo(HISTORY_DAYS - 1);
  const [entries, setEntries] = useState<Entry[]>(
    () => getCachedEntries()?.filter((e) => e.date >= earliestEntry) ?? []
  );
  const [goals, setGoals] = useState<Record<string, number>>(initialGoals);
  const [weeklyGoals, setWeeklyGoals] =
    useState<Record<string, number | undefined>>(initialWeeklyGoals);
  const [loading, setLoading] = useState(getCachedEntries() === null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, goalsData] = await Promise.all([
        fetchEntries({ from: isoDateDaysAgo(HISTORY_DAYS - 1) }),
        fetchGoals(),
      ]);
      setEntries(entriesData);
      setGoals(() => {
        const next: Record<string, number> = {};
        for (const g of goalsData) next[g.habit] = g.target;
        return next;
      });
      setWeeklyGoals(() => {
        const next: Record<string, number | undefined> = {};
        for (const g of goalsData) next[g.habit] = g.weeklyTarget ?? undefined;
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
      // Der Vorschauwert wird aus der vorigen Liste berechnet, nicht aus dem
      // Closure — sonst rechnen mehrere schnelle Taps alle vom selben, schon
      // veralteten Stand aus und die Anzeige bleibt hinter den Tipps zurück.
      setEntries((prev) => {
        const current = prev.find((e) => e.habit === habit && e.date === today)?.value ?? 0;
        const others = prev.filter((e) => !(e.habit === habit && e.date === today));
        return [...others, { habit, date: today, value: Math.max(0, current + delta) }];
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
    [today, load]
  );

  const setValue = useCallback(
    async (habit: HabitType, value: number) => {
      setEntries((prev) => {
        const others = prev.filter((e) => !(e.habit === habit && e.date === today));
        return [...others, { habit, date: today, value }];
      });
      try {
        const entry = await addEntry({ habit, date: today, value });
        setEntries((prev) => {
          const others = prev.filter((e) => !(e.habit === habit && e.date === today));
          return [...others, entry];
        });
      } catch {
        load();
      }
    },
    [today, load]
  );

  return {
    entries,
    goals,
    weeklyGoals,
    loading,
    entriesFor,
    todayValueFor,
    addDelta,
    setValue,
    reload: load,
  };
}
