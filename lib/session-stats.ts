import {
  effectiveLoad,
  estimateOneRepMax,
  measuredOn,
  sessionVolume,
  workingSets,
  type Exercise,
  type Muscle,
  type WorkoutSession,
  type WorkoutSet,
} from "@/lib/training";

/**
 * Welche Art Bestleistung eine Einheit gebracht hat. Die Reihenfolge ist auch
 * die Rangfolge: mehr Gewicht schlägt mehr Wiederholungen, das schlägt das
 * geschätzte Maximum, das schlägt mehr Arbeitsvolumen. Das Maximum steht
 * bewusst hinter den Wiederholungen — es ist aus ihnen gerechnet, und "eine
 * Wiederholung mehr" ist die Leistung, an die man sich erinnert.
 */
export type RecordKind = "weight" | "reps" | "oneRm" | "volume";

export const RECORD_LABELS: Record<RecordKind, string> = {
  weight: "Neues Bestgewicht",
  oneRm: "Neues Maximum",
  reps: "Neue Bestwiederholung",
  volume: "Neues Bestvolumen",
};

export type ExerciseTally = {
  exerciseId: string;
  name: string;
  muscle: Muscle | null;
  sets: number;
  reps: number;
  volume: number;
  topWeight: number;
  topReps: number;
  oneRm: number;
};

export type ExerciseResult = ExerciseTally & {
  /** Dieselbe Übung in der jüngsten Einheit davor — Grundlage der Deltas. */
  previous: ExerciseTally | null;
  /** Bestleistungen, absteigend nach Rang. Leer beim ersten Mal. */
  records: RecordKind[];
};

export type SessionSummary = {
  session: WorkoutSession;
  volume: number;
  sets: number;
  reps: number;
  durationSeconds: number | null;
  /** Volumen je Trainingsminute — wie dicht die Einheit war. */
  density: number | null;
  exercises: ExerciseResult[];
  setsByMuscle: Record<string, number>;
  records: { exercise: ExerciseResult; kind: RecordKind }[];
  /** Die letzte Einheit desselben Tages im Plan, falls es eine gibt. */
  previousSession: WorkoutSession | null;
  /** Volumenveränderung gegenüber dieser Einheit. */
  volumeDelta: number | null;
};

function tally(
  exerciseId: string,
  sets: WorkoutSet[],
  exercise: Exercise | undefined,
  bodyweight: number | null
): ExerciseTally {
  const topWeight = Math.max(...sets.map((s) => s.weight));
  const atTop = sets.filter((s) => s.weight === topWeight);
  return {
    exerciseId,
    name: exercise?.name ?? exerciseId,
    muscle: exercise?.muscle ?? null,
    sets: sets.length,
    reps: sets.reduce((sum, s) => sum + s.reps, 0),
    volume: sets.reduce((sum, s) => sum + effectiveLoad(s, exercise, bodyweight) * s.reps, 0),
    topWeight,
    topReps: Math.max(...atTop.map((s) => s.reps)),
    oneRm:
      Math.round(
        sets.reduce((acc, s) => Math.max(acc, estimateOneRepMax(s.weight, s.reps)), 0) * 10
      ) / 10,
  };
}

/** Alle abgehakten Sätze einer Einheit nach Übung gruppiert. */
function groupByExercise(session: WorkoutSession): Map<string, WorkoutSet[]> {
  const map = new Map<string, WorkoutSet[]>();
  for (const set of workingSets(session.sets)) {
    const list = map.get(set.exerciseId) ?? [];
    list.push(set);
    map.set(set.exerciseId, list);
  }
  return map;
}

/**
 * Wertet eine Einheit gegen alles aus, was davor liegt: Deltas zur letzten
 * gleichen Übung und neue Bestleistungen. `history` darf die Einheit selbst
 * enthalten — sie wird herausgefiltert.
 */
export function summarizeSession(
  session: WorkoutSession,
  history: WorkoutSession[],
  exerciseById: Record<string, Exercise>,
  /** Gemessene Körpergewichte, aufsteigend — für Eigengewichtsübungen. */
  weights: { date: string; value: number }[] = []
): SessionSummary {
  // Das Körpergewicht vom Tag der Einheit, nicht das heutige.
  const bodyweight = measuredOn(session.date, weights);
  // Alles, was zeitlich vor dieser Einheit liegt. Bei gleichem Datum zählt eine
  // andere Einheit als "davor" — genauer geht es ohne Uhrzeit im Client nicht.
  const before = history
    .filter((s) => s.id !== session.id && s.date <= session.date)
    .sort((a, b) => b.date.localeCompare(a.date));

  const grouped = groupByExercise(session);
  const exercises: ExerciseResult[] = [];

  for (const [exerciseId, sets] of grouped) {
    const current = tally(exerciseId, sets, exerciseById[exerciseId], bodyweight);

    // Die jüngste frühere Einheit mit dieser Übung liefert den Vergleichswert.
    let previous: ExerciseTally | null = null;
    const earlierTallies: ExerciseTally[] = [];
    for (const past of before) {
      const pastSets = workingSets(past.sets).filter((s) => s.exerciseId === exerciseId);
      if (pastSets.length === 0) continue;
      const t = tally(exerciseId, pastSets, exerciseById[exerciseId], measuredOn(past.date, weights));
      if (!previous) previous = t;
      earlierTallies.push(t);
    }

    // Ohne Vergangenheit gibt es keinen Rekord — sonst wäre jede erste Einheit
    // ein Feuerwerk aus Bestleistungen und die Auszeichnung wertlos.
    const records: RecordKind[] = [];
    if (earlierTallies.length > 0) {
      const bestWeight = Math.max(...earlierTallies.map((t) => t.topWeight));
      const bestOneRm = Math.max(...earlierTallies.map((t) => t.oneRm));
      const bestReps = Math.max(...earlierTallies.map((t) => t.topReps));
      const bestVolume = Math.max(...earlierTallies.map((t) => t.volume));

      if (current.topWeight > bestWeight) records.push("weight");
      // Mehr Wiederholungen zählen nur, wenn das Gewicht nicht gefallen ist —
      // sonst wäre jeder leichtere Satz mit hoher Wiederholungszahl ein Rekord.
      if (current.topReps > bestReps && current.topWeight >= bestWeight) records.push("reps");
      if (current.oneRm > bestOneRm && current.topWeight > 0) records.push("oneRm");
      if (current.volume > bestVolume && current.volume > 0) records.push("volume");
    }

    exercises.push({ ...current, previous, records });
  }

  const setsByMuscle: Record<string, number> = {};
  for (const result of exercises) {
    if (!result.muscle) continue;
    setsByMuscle[result.muscle] = (setsByMuscle[result.muscle] ?? 0) + result.sets;
  }

  const volume = sessionVolume(session, exerciseById, bodyweight);
  const sets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const reps = exercises.reduce((sum, e) => sum + e.reps, 0);
  const minutes = session.durationSeconds ? session.durationSeconds / 60 : null;

  const previousSession =
    before.find((s) => (session.dayId ? s.dayId === session.dayId : s.dayName === session.dayName)) ??
    null;

  return {
    session,
    volume,
    sets,
    reps,
    durationSeconds: session.durationSeconds,
    density: minutes && minutes > 0 ? volume / minutes : null,
    exercises,
    setsByMuscle,
    // Nur die stärkste Auszeichnung je Übung — sonst steht dieselbe Leistung
    // vierfach im Abschluss.
    records: exercises
      .filter((e) => e.records.length > 0)
      .map((e) => ({ exercise: e, kind: e.records[0] })),
    previousSession,
    volumeDelta: previousSession
      ? volume - sessionVolume(previousSession, exerciseById, measuredOn(previousSession.date, weights))
      : null,
  };
}
