import { HabitType, HabitKind } from "@/lib/habits";
import { readAll, readOne } from "@/lib/local-db";
import { entryKey } from "@/lib/sync-payload";
import { enqueue, flushQueue } from "@/lib/write-queue";
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

/**
 * Einen Eintrag setzen oder verändern.
 *
 * Hier wird aus einem delta ein absoluter Wert: die Warteschlange darf jede
 * Operation wiederholen, und zweimal "+250" wären 500. Der Ausgangswert kommt
 * aus dem lokalen Bestand — der ist auch ohne Netz da, und genau deshalb
 * funktioniert das Eintragen offline.
 *
 * Die Untergrenze 0 bildet nach, was die Route bei delta tat (MAX(0, …)) —
 * zweimal "-250" auf 100 ml ergibt 0, keine negative Menge.
 */
export async function addEntry(params: {
  habit: HabitType;
  date: string;
  delta?: number;
  value?: number;
}): Promise<Entry> {
  const current = await readOne<Entry>("entries", entryKey(params.habit, params.date));
  const value =
    params.value !== undefined
      ? params.value
      : Math.max(0, (current?.value ?? 0) + (params.delta ?? 0));

  const entry: Entry = { habit: params.habit, date: params.date, value };
  await enqueue({ kind: "entry.set", entry });
  void flushQueue();
  return entry;
}

export async function fetchGoals(): Promise<Goal[]> {
  await ensureLocalData();
  return readAll<Goal>("goals");
}

/**
 * Ein Ziel setzen. Ohne weeklyTarget bleibt ein bestehendes Wochenziel stehen —
 * die Route unterschied bisher zwischen "nicht mitgeschickt" und "auf null
 * gesetzt". Eine wiederholbare Operation muss immer den vollständigen Zustand
 * tragen, also wird der bisherige Wert hier aus dem lokalen Bestand geholt,
 * statt ihn versehentlich zu löschen.
 */
export async function setGoal(
  habit: HabitType,
  target: number,
  weeklyTarget?: number | null
): Promise<void> {
  const current = await readOne<Goal>("goals", habit);
  await enqueue({
    kind: "goal.set",
    goal: {
      habit,
      target,
      weeklyTarget: weeklyTarget === undefined ? current?.weeklyTarget ?? null : weeklyTarget,
    },
  });
  void flushQueue();
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
