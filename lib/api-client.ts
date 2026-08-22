import { HabitType, HabitKind } from "@/lib/habits";
import { readAll } from "@/lib/local-db";
import { ensureLocalData, syncSoon } from "@/lib/sync";

export type Entry = { habit: HabitType; date: string; value: number };
export type Goal = { habit: HabitType; target: number; weeklyTarget?: number | null };

export async function fetchEntries(params: {
  habit?: HabitType;
  from?: string;
  to?: string;
}): Promise<Entry[]> {
  await ensureLocalData();
  const all = await readAll<Entry>("entries");
  // Dieselben Filter, die vorher im SQL standen. Sortiert ist bereits nach
  // Datum aufsteigend, so wie es die Route lieferte.
  return all.filter(
    (e) =>
      (!params.habit || e.habit === params.habit) &&
      (!params.from || e.date >= params.from) &&
      (!params.to || e.date <= params.to)
  );
}

export async function addEntry(params: {
  habit: HabitType;
  date: string;
  delta?: number;
  value?: number;
}): Promise<Entry> {
  const res = await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Konnte Eintrag nicht speichern");
  syncSoon();
  const data = await res.json();
  return data.entry as Entry;
}

export async function fetchGoals(): Promise<Goal[]> {
  await ensureLocalData();
  return readAll<Goal>("goals");
}

export async function setGoal(
  habit: HabitType,
  target: number,
  weeklyTarget?: number | null
): Promise<void> {
  const res = await fetch("/api/goals", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ habit, target, weeklyTarget }),
  });
  if (!res.ok) throw new Error("Konnte Ziel nicht speichern");
  syncSoon();
}

export type CustomHabit = {
  id: string;
  label: string;
  unit: string;
  icon: string;
  defaultGoal: number;
  quickAdd: number[];
  step: number;
  kind: HabitKind;
};

export async function fetchCustomHabits(): Promise<CustomHabit[]> {
  await ensureLocalData();
  return readAll<CustomHabit>("habits");
}

export async function createCustomHabit(params: {
  label: string;
  unit: string;
  icon: string;
  defaultGoal: number;
  quickAdd: number[];
  step: number;
  kind: HabitKind;
  weeklyGoal?: number | null;
}): Promise<CustomHabit> {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Konnte Habit nicht erstellen");
  syncSoon();
  const data = await res.json();
  return data.habit as CustomHabit;
}

export async function updateCustomHabit(
  id: string,
  params: {
    label: string;
    unit: string;
    icon: string;
    defaultGoal: number;
    quickAdd: number[];
    step: number;
    kind: HabitKind;
    weeklyGoal?: number | null;
  }
): Promise<CustomHabit> {
  const res = await fetch("/api/habits", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...params }),
  });
  if (!res.ok) throw new Error("Konnte Habit nicht aktualisieren");
  syncSoon();
  const data = await res.json();
  return data.habit as CustomHabit;
}

export async function deleteCustomHabit(id: string): Promise<void> {
  const res = await fetch(`/api/habits?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Konnte Habit nicht löschen");
  syncSoon();
}
