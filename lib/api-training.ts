import type { Equipment, Exercise, Muscle, WorkoutPlan, WorkoutSession } from "@/lib/training";
import { readAll } from "@/lib/local-db";
import { ensureLocalData, syncSoon } from "@/lib/sync";

/**
 * Antwort eines Schreibvorgangs auswerten. Seit die Lesepfade lokal laufen,
 * kommt hier nur noch Schreibendes durch — deshalb zieht ein Erfolg gleich den
 * lokalen Bestand nach.
 */
async function json<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || fallback);
  }
  const parsed = (await res.json()) as T;
  syncSoon();
  return parsed;
}

export type DayInput = {
  name: string;
  weekday?: number | null;
  exercises: {
    exerciseId: string;
    sets?: number;
    repMin?: number;
    repMax?: number;
    restSeconds?: number;
    increment?: number | null;
    startWeight?: number | null;
  }[];
};

export async function fetchExercises(): Promise<Exercise[]> {
  await ensureLocalData();
  return readAll<Exercise>("exercises");
}

export async function createExercise(params: {
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  increment?: number | null;
  bodyweightFactor?: number | null;
  warmup?: "always" | "never" | null;
}): Promise<Exercise> {
  const res = await fetch("/api/training/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return (await json<{ exercise: Exercise }>(res, "Konnte Übung nicht anlegen")).exercise;
}

export async function updateExercise(params: {
  id: string;
  name?: string;
  muscle?: Muscle;
  equipment?: Equipment;
  increment?: number | null;
  bodyweightFactor?: number | null;
  loadFactor?: number | null;
  warmup?: "always" | "never" | null;
  hidden?: boolean;
}): Promise<Exercise> {
  const res = await fetch("/api/training/exercises", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return (await json<{ exercise: Exercise }>(res, "Konnte Übung nicht speichern")).exercise;
}

export async function deleteExercise(id: string): Promise<void> {
  const res = await fetch(`/api/training/exercises?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await json(res, "Konnte Übung nicht entfernen");
}

export async function fetchPlans(): Promise<WorkoutPlan[]> {
  await ensureLocalData();
  return readAll<WorkoutPlan>("plans");
}

export async function createPlan(params: {
  name?: string;
  days?: DayInput[];
  duplicateOf?: string;
  weeklyTarget?: number | null;
}): Promise<{ plan: WorkoutPlan; plans: WorkoutPlan[] }> {
  const res = await fetch("/api/training/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return json(res, "Konnte Plan nicht anlegen");
}

export async function updatePlan(params: {
  id: string;
  name?: string;
  isActive?: boolean;
  days?: DayInput[];
  weeklyTarget?: number | null;
}): Promise<{ plan: WorkoutPlan; plans: WorkoutPlan[] }> {
  const res = await fetch("/api/training/plans", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return json(res, "Konnte Plan nicht speichern");
}

export async function deletePlan(id: string): Promise<WorkoutPlan[]> {
  const res = await fetch(`/api/training/plans?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return (await json<{ plans: WorkoutPlan[] }>(res, "Konnte Plan nicht löschen")).plans;
}

export async function fetchSessions(params: { limit?: number; from?: string } = {}): Promise<
  WorkoutSession[]
> {
  await ensureLocalData();
  // Absteigend gelesen, wie es das ORDER BY date DESC, started_at DESC der
  // Route tat — die Progression verlässt sich darauf, dass die jüngste Einheit
  // vorne steht.
  const all = await readAll<WorkoutSession>("sessions", true);
  const gefiltert = params.from ? all.filter((s) => s.date >= params.from!) : all;
  return params.limit ? gefiltert.slice(0, params.limit) : gefiltert;
}

export type SessionInput = {
  planId?: string | null;
  dayId?: string | null;
  dayName: string;
  date?: string;
  durationSeconds?: number | null;
  note?: string | null;
  sets: {
    exerciseId: string;
    setIndex: number;
    weight: number;
    reps: number;
    done?: boolean;
    warmup?: boolean;
  }[];
};

export async function saveSession(params: SessionInput): Promise<{ id: string; date: string }> {
  const res = await fetch("/api/training/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return json(res, "Konnte Einheit nicht speichern");
}

export async function updateSession(params: {
  id: string;
  dayName?: string;
  date?: string;
  durationSeconds?: number | null;
  note?: string | null;
  sets?: {
    exerciseId: string;
    setIndex: number;
    weight: number;
    reps: number;
    done?: boolean;
    warmup?: boolean;
  }[];
}): Promise<{ id: string; date: string }> {
  const res = await fetch("/api/training/sessions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return json(res, "Konnte Einheit nicht speichern");
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/training/sessions?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await json(res, "Konnte Einheit nicht löschen");
}
