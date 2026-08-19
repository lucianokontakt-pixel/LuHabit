"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api-training";
import type { Exercise, WorkoutPlan, WorkoutSession, WorkoutSet } from "@/lib/training";

type TrainingContextValue = {
  exercises: Exercise[];
  exerciseById: Record<string, Exercise>;
  plans: WorkoutPlan[];
  activePlan: WorkoutPlan | null;
  sessions: WorkoutSession[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setPlans: (plans: WorkoutPlan[]) => void;
  addSession: (session: WorkoutSession) => void;
  removeSession: (id: string) => Promise<void>;
  upsertExercise: (exercise: Exercise) => void;
  /** Zuletzt protokollierte Sätze einer Übung — Basis der Progression. */
  lastSetsFor: (exerciseId: string, beforeSessionId?: string) => WorkoutSet[];
};

const TrainingContext = createContext<TrainingContextValue | null>(null);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ex, pl, se] = await Promise.all([
        api.fetchExercises(),
        api.fetchPlans(),
        api.fetchSessions({ limit: 300 }),
      ]);
      setExercises(ex);
      setPlans(pl);
      setSessions(se);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trainingsdaten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    reload();
  }, [reload]);

  const exerciseById = useMemo(() => {
    const map: Record<string, Exercise> = {};
    for (const e of exercises) map[e.id] = e;
    return map;
  }, [exercises]);

  const activePlan = useMemo(
    () => plans.find((p) => p.isActive) ?? plans[0] ?? null,
    [plans]
  );

  const addSession = useCallback((session: WorkoutSession) => {
    // Einsortieren statt vorne anhängen: eine nachgetragene Einheit ist nicht
    // die neueste. lastSetsFor und damit die ganze Progression verlassen sich
    // darauf, dass die Liste absteigend nach Datum steht — genau wie das ORDER
    // BY der API. sort ist stabil, gleichdatierte Einheiten bleiben also in der
    // Reihenfolge, in der sie hinzukamen.
    setSessions((prev) => [session, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  const removeSession = useCallback(async (id: string) => {
    await api.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const upsertExercise = useCallback((exercise: Exercise) => {
    setExercises((prev) => {
      const without = prev.filter((e) => e.id !== exercise.id);
      return [...without, exercise].sort((a, b) => a.name.localeCompare(b.name, "de"));
    });
  }, []);

  const lastSetsFor = useCallback(
    (exerciseId: string, beforeSessionId?: string) => {
      // sessions ist absteigend nach Datum sortiert — die erste Einheit mit
      // dieser Übung ist die jüngste.
      for (const session of sessions) {
        if (beforeSessionId && session.id === beforeSessionId) continue;
        const sets = session.sets.filter((s) => s.exerciseId === exerciseId && s.done);
        if (sets.length > 0) return sets;
      }
      return [];
    },
    [sessions]
  );

  const value: TrainingContextValue = {
    exercises,
    exerciseById,
    plans,
    activePlan,
    sessions,
    loading,
    error,
    reload,
    setPlans,
    addSession,
    removeSession,
    upsertExercise,
    lastSetsFor,
  };

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining() {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error("useTraining muss innerhalb von TrainingProvider genutzt werden");
  return ctx;
}
