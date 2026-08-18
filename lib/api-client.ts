import { HabitType } from "@/lib/habits";

export type Entry = { habit: HabitType; date: string; value: number };
export type Goal = { habit: HabitType; target: number };

export async function fetchEntries(params: {
  habit?: HabitType;
  from?: string;
  to?: string;
}): Promise<Entry[]> {
  const search = new URLSearchParams();
  if (params.habit) search.set("habit", params.habit);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);

  const res = await fetch(`/api/entries?${search.toString()}`);
  if (!res.ok) throw new Error("Konnte Einträge nicht laden");
  const data = await res.json();
  return data.entries as Entry[];
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
  const data = await res.json();
  return data.entry as Entry;
}

export async function fetchGoals(): Promise<Goal[]> {
  const res = await fetch("/api/goals");
  if (!res.ok) throw new Error("Konnte Ziele nicht laden");
  const data = await res.json();
  return data.goals as Goal[];
}

export async function setGoal(habit: HabitType, target: number): Promise<void> {
  const res = await fetch("/api/goals", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ habit, target }),
  });
  if (!res.ok) throw new Error("Konnte Ziel nicht speichern");
}

export type CustomHabit = {
  id: string;
  label: string;
  unit: string;
  icon: string;
  defaultGoal: number;
  quickAdd: number[];
  step: number;
};

export async function fetchCustomHabits(): Promise<CustomHabit[]> {
  const res = await fetch("/api/habits");
  if (!res.ok) throw new Error("Konnte eigene Habits nicht laden");
  const data = await res.json();
  return data.habits as CustomHabit[];
}

export async function createCustomHabit(params: {
  label: string;
  unit: string;
  icon: string;
  defaultGoal: number;
  quickAdd: number[];
  step: number;
}): Promise<CustomHabit> {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Konnte Habit nicht erstellen");
  const data = await res.json();
  return data.habit as CustomHabit;
}

export async function deleteCustomHabit(id: string): Promise<void> {
  const res = await fetch(`/api/habits?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Konnte Habit nicht löschen");
}
