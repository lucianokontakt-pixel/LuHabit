"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api-training";
import { fetchEntries } from "@/lib/api-client";
import { isoDateDaysAgo } from "@/lib/habits";
import { trainingHabitSummary, type TrainingHabitSummary } from "@/lib/training-habit";
import type { Exercise, WorkoutPlan, WorkoutSession } from "@/lib/training";

const WEEK_COUNT = 12;
// Ein paar Tage Puffer, damit die älteste Woche vollständig im Fenster liegt,
// egal auf welchen Wochentag "heute" fällt.
const WINDOW_DAYS = WEEK_COUNT * 7 + 7;

/**
 * Schlanke Datenquelle für die Trainingskarte auf dem Dashboard.
 *
 * Läuft bewusst am TrainingProvider vorbei — der lädt 300 Einheiten und
 * mountet nur unter /training. Hier reichen die letzten 12 Wochen, direkt
 * über dieselben API-Routen wie der Trainingsbereich.
 */
export function useTrainingHabit() {
  const [summary, setSummary] = useState<TrainingHabitSummary | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [exerciseById, setExerciseById] = useState<Record<string, Exercise>>({});
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = isoDateDaysAgo(WINDOW_DAYS - 1);
      const [loadedSessions, exercises, plans, weights] = await Promise.all([
        api.fetchSessions({ from }),
        api.fetchExercises(),
        api.fetchPlans(),
        fetchEntries({ habit: "weight", from }),
      ]);

      const byId: Record<string, Exercise> = {};
      for (const exercise of exercises) byId[exercise.id] = exercise;
      const plan = plans.find((p) => p.isActive) ?? null;

      setSessions(loadedSessions);
      setExerciseById(byId);
      setActivePlan(plan);
      setSummary(
        trainingHabitSummary(
          loadedSessions,
          byId,
          plan?.weeklyTarget ?? null,
          WEEK_COUNT,
          new Date(),
          weights
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trainingsdaten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    load();
  }, [load]);

  return { summary, sessions, exerciseById, activePlan, loading, error, reload: load };
}
