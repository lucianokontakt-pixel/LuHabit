import {
  estimateOneRepMax,
  incrementFor,
  roundToIncrement,
  workingSets,
  type Exercise,
  type PlanExercise,
  type WorkoutSession,
} from "@/lib/training";

/** Ein Datenpunkt je Einheit, in der die Übung vorkam. */
export type ProgressPoint = {
  date: string;
  /** Schwerstes Gewicht der Einheit — das gilt als Arbeitsgewicht. */
  topWeight: number;
  /** Beste Wiederholungszahl auf diesem Gewicht. */
  topReps: number;
  sets: number;
  volume: number;
  oneRm: number;
};

export type ProgressSummary = {
  exercise: Exercise;
  points: ProgressPoint[];
  current: number;
  currentReps: number;
  best: number;
  bestOneRm: number;
  lastDate: string | null;
  /** Übungen ohne Zusatzgewicht steigern sich über Wiederholungen. */
  repsBased: boolean;
  /** Einheiten seit der letzten echten Steigerung. */
  sessionsSinceGain: number;
  stagnating: boolean;
  /** Veränderung gegenüber dem Stand vor n Wochen (kg bzw. Wdh). */
  changeIn: (weeks: number) => number | null;
};

/** Zeitlich aufsteigender Verlauf einer Übung aus allen Einheiten. */
export function exerciseHistory(
  exerciseId: string,
  sessions: WorkoutSession[]
): ProgressPoint[] {
  return [...sessions]
    .filter((s) => workingSets(s.sets).some((set) => set.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((session) => {
      const sets = workingSets(session.sets).filter((s) => s.exerciseId === exerciseId);
      const topWeight = Math.max(...sets.map((s) => s.weight));
      const atTop = sets.filter((s) => s.weight === topWeight);
      return {
        date: session.date,
        topWeight,
        topReps: Math.max(...atTop.map((s) => s.reps)),
        sets: sets.length,
        volume: sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
        oneRm:
          Math.round(
            sets.reduce((acc, s) => Math.max(acc, estimateOneRepMax(s.weight, s.reps)), 0) * 10
          ) / 10,
      };
    });
}

function isoWeeksAgo(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return d.toLocaleDateString("sv-SE");
}

/** Einheiten seit der letzten Steigerung — bei 0 kg zählen Wiederholungen. */
function countSessionsSinceGain(points: ProgressPoint[], repsBased: boolean): number {
  if (points.length < 2) return 0;
  const value = (p: ProgressPoint) => (repsBased ? p.topReps : p.topWeight);

  let since = 0;
  for (let i = points.length - 1; i > 0; i--) {
    if (value(points[i]) > value(points[i - 1])) return since;
    since++;
  }
  return since;
}

export const STAGNATION_THRESHOLD = 3;
export const DELOAD_FACTOR = 0.9;

export function summarizeProgress(
  exercise: Exercise,
  sessions: WorkoutSession[]
): ProgressSummary {
  const points = exerciseHistory(exercise.id, sessions);
  const latest = points[points.length - 1];

  // Ohne jedes Zusatzgewicht ist die Übung reine Wiederholungsarbeit.
  const repsBased = points.length > 0 && points.every((p) => p.topWeight === 0);
  const sessionsSinceGain = countSessionsSinceGain(points, repsBased);

  const changeIn = (weeks: number): number | null => {
    if (points.length < 2 || !latest) return null;
    const cutoff = isoWeeksAgo(weeks);
    const older = points.filter((p) => p.date <= cutoff);
    // Ohne Datenpunkt im Zeitfenster gibt es nichts zu vergleichen.
    if (older.length === 0) return null;
    const reference = older[older.length - 1];
    return repsBased
      ? latest.topReps - reference.topReps
      : latest.topWeight - reference.topWeight;
  };

  return {
    exercise,
    points,
    current: latest?.topWeight ?? 0,
    currentReps: latest?.topReps ?? 0,
    best: points.reduce((acc, p) => Math.max(acc, p.topWeight), 0),
    bestOneRm: points.reduce((acc, p) => Math.max(acc, p.oneRm), 0),
    lastDate: latest?.date ?? null,
    repsBased,
    sessionsSinceGain,
    stagnating:
      points.length > STAGNATION_THRESHOLD && sessionsSinceGain >= STAGNATION_THRESHOLD,
    changeIn,
  };
}

/** Einmaliger Rückschritt, um wieder Anlauf nehmen zu können. */
export function deloadWeight(
  weight: number,
  exercise: Exercise,
  planExercise?: PlanExercise | null
): number {
  const increment = incrementFor(exercise, planExercise);
  const reduced = roundToIncrement(weight * DELOAD_FACTOR, increment);
  // Mindestens einen Sprung runter, sonst ändert sich bei kleinen Gewichten nichts.
  return Math.max(increment, Math.min(reduced, weight - increment));
}
