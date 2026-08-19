import type { Equipment, Exercise, Muscle, WorkoutPlan, WorkoutSession } from "@/lib/training";

async function json<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || fallback);
  }
  return (await res.json()) as T;
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
  const res = await fetch("/api/training/exercises");
  return (await json<{ exercises: Exercise[] }>(res, "Konnte Übungen nicht laden")).exercises;
}

export async function createExercise(params: {
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  increment?: number | null;
  bodyweightFactor?: number | null;
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
  const res = await fetch("/api/training/plans");
  return (await json<{ plans: WorkoutPlan[] }>(res, "Konnte Pläne nicht laden")).plans;
}

export async function createPlan(params: {
  name?: string;
  days?: DayInput[];
  duplicateOf?: string;
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
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  if (params.from) search.set("from", params.from);
  const res = await fetch(`/api/training/sessions?${search.toString()}`);
  return (await json<{ sessions: WorkoutSession[] }>(res, "Konnte Einheiten nicht laden")).sessions;
}

export async function saveSession(params: {
  planId?: string | null;
  dayId?: string | null;
  dayName: string;
  date?: string;
  durationSeconds?: number | null;
  note?: string | null;
  sets: { exerciseId: string; setIndex: number; weight: number; reps: number; done?: boolean }[];
}): Promise<{ id: string; date: string }> {
  const res = await fetch("/api/training/sessions", {
    method: "POST",
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
