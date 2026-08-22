"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api-training";
import { pendingToSession, readOutbox, removePending, subscribeOutbox } from "@/lib/outbox";
import type { PendingSession } from "@/lib/outbox";
import { workingSets } from "@/lib/training";
import type { Exercise, WorkoutPlan, WorkoutSession, WorkoutSet } from "@/lib/training";

type TrainingContextValue = {
  exercises: Exercise[];
  exerciseById: Record<string, Exercise>;
  plans: WorkoutPlan[];
  activePlan: WorkoutPlan | null;
  sessions: WorkoutSession[];
  /** Ohne Netz abgeschlossene Einheiten, die noch auf den Server warten. */
  pendingIds: Set<string>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setPlans: (plans: WorkoutPlan[]) => void;
  addSession: (session: WorkoutSession) => void;
  replaceSession: (session: WorkoutSession) => void;
  removeSession: (id: string) => Promise<void>;
  upsertExercise: (exercise: Exercise) => void;
  /** Zuletzt protokollierte Sätze einer Übung — Basis der Progression. */
  lastSetsFor: (exerciseId: string) => WorkoutSet[];
};

const TrainingContext = createContext<TrainingContextValue | null>(null);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [serverSessions, setServerSessions] = useState<WorkoutSession[]>([]);
  const [pending, setPending] = useState<PendingSession[]>([]);
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
      setServerSessions(se);
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

  // Wartende Einheiten mitführen, bis OutboxSync sie losgeworden ist. Wird die
  // Schlange kürzer, ist etwas durchgegangen — dann holt reload die Einheit mit
  // ihrer echten ID vom Server nach.
  useEffect(() => {
    let previous = readOutbox();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Erststand der Warteschlange beim Mount
    setPending(previous);
    return subscribeOutbox((next) => {
      const shrank = next.length < previous.length;
      previous = next;
      setPending(next);
      if (shrank) reload();
    });
  }, [reload]);

  const pendingIds = useMemo(() => new Set(pending.map((p) => p.localId)), [pending]);

  const sessions = useMemo(() => {
    if (pending.length === 0) return serverSessions;
    return [...pending.map(pendingToSession), ...serverSessions].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [pending, serverSessions]);

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
    setServerSessions((prev) => [session, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  /**
   * Eine bearbeitete Einheit an ihren Platz setzen. Das Datum kann sich beim
   * Bearbeiten geändert haben, deshalb wird danach wie in addSession sortiert —
   * lastSetsFor und die ganze Progression verlassen sich auf absteigende Daten.
   */
  const replaceSession = useCallback((session: WorkoutSession) => {
    setServerSessions((prev) =>
      prev
        .map((s) => (s.id === session.id ? session : s))
        .sort((a, b) => b.date.localeCompare(a.date))
    );
  }, []);

  const removeSession = useCallback(async (id: string) => {
    // Eine wartende Einheit kennt der Server noch gar nicht — die wird nur aus
    // der Warteschlange geworfen.
    if (readOutbox().some((p) => p.localId === id)) {
      removePending(id);
      return;
    }
    await api.deleteSession(id);
    setServerSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const upsertExercise = useCallback((exercise: Exercise) => {
    setExercises((prev) => {
      const without = prev.filter((e) => e.id !== exercise.id);
      return [...without, exercise].sort((a, b) => a.name.localeCompare(b.name, "de"));
    });
  }, []);

  const lastSetsFor = useCallback(
    (exerciseId: string) => {
      // sessions ist absteigend nach Datum sortiert — die erste Einheit mit
      // dieser Übung ist die jüngste.
      for (const session of sessions) {
        const sets = workingSets(session.sets).filter((s) => s.exerciseId === exerciseId);
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
    pendingIds,
    loading,
    error,
    reload,
    setPlans,
    addSession,
    replaceSession,
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
