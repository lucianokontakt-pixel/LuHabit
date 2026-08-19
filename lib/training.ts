export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight";

export const MUSCLES: { key: Muscle; label: string; group: "upper" | "lower" }[] = [
  { key: "chest", label: "Brust", group: "upper" },
  { key: "back", label: "Rücken", group: "upper" },
  { key: "shoulders", label: "Schultern", group: "upper" },
  { key: "biceps", label: "Bizeps", group: "upper" },
  { key: "triceps", label: "Trizeps", group: "upper" },
  { key: "quads", label: "Quadrizeps", group: "lower" },
  { key: "hamstrings", label: "Beinbeuger", group: "lower" },
  { key: "glutes", label: "Gesäß", group: "lower" },
  { key: "calves", label: "Waden", group: "lower" },
  { key: "core", label: "Rumpf", group: "upper" },
];

export const MUSCLE_LABELS: Record<Muscle, string> = Object.fromEntries(
  MUSCLES.map((m) => [m.key, m.label])
) as Record<Muscle, string>;

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Langhantel",
  dumbbell: "Kurzhantel",
  machine: "Maschine",
  cable: "Kabelzug",
  bodyweight: "Körpergewicht",
};

/**
 * Standard-Gewichtssprung: Oberkörper 2,5 kg, Unterkörper 5 kg.
 * Pro Übung und pro Plan-Eintrag überschreibbar.
 */
export function defaultIncrement(muscle: Muscle): number {
  const entry = MUSCLES.find((m) => m.key === muscle);
  return entry?.group === "lower" ? 5 : 2.5;
}

export type Exercise = {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  isCustom: boolean;
  hidden: boolean;
  /** Überschreibt defaultIncrement, falls gesetzt. */
  increment: number | null;
  /** Startgewicht-Vorschlag = Körpergewicht × Faktor. */
  bodyweightFactor: number | null;
};

export type PlanExercise = {
  id: string;
  exerciseId: string;
  position: number;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  increment: number | null;
  startWeight: number | null;
};

export type PlanDay = {
  id: string;
  name: string;
  position: number;
  /** null = freie Rotation, 0–6 = fester Wochentag (0 = Montag). */
  weekday: number | null;
  exercises: PlanExercise[];
};

export type WorkoutPlan = {
  id: string;
  name: string;
  isActive: boolean;
  position: number;
  days: PlanDay[];
};

export type WorkoutSet = {
  id: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  done: boolean;
};

export type WorkoutSession = {
  id: string;
  planId: string | null;
  dayId: string | null;
  dayName: string;
  date: string;
  durationSeconds: number | null;
  note: string | null;
  sets: WorkoutSet[];
};

export const WEEKDAY_NAMES = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

/** Auf das nächste Vielfache des Gewichtssprungs runden. */
export function roundToIncrement(weight: number, increment: number): number {
  if (increment <= 0) return Math.round(weight * 10) / 10;
  return Math.round(weight / increment) * increment;
}

export function incrementFor(exercise: Exercise, planExercise?: PlanExercise | null): number {
  return (
    planExercise?.increment ?? exercise.increment ?? defaultIncrement(exercise.muscle)
  );
}

export type SetTarget = { weight: number; reps: number };

export type ProgressionResult = {
  targets: SetTarget[];
  /** true, wenn die letzte Einheit die Obergrenze in allen Sätzen erreicht hat. */
  progressed: boolean;
  /** Kein Verlauf vorhanden — Vorschlag stammt aus dem Körpergewicht. */
  isFirstTime: boolean;
};

/**
 * Double Progression: erst wenn ALLE Arbeitssätze die Obergrenze des
 * Wiederholungsbereichs erreicht haben, steigt das Gewicht — und der
 * Bereich beginnt wieder unten. Sonst bleibt das Gewicht stehen und es
 * gilt, eine Wiederholung mehr zu schaffen.
 */
export function computeTargets({
  exercise,
  planExercise,
  lastSets,
  bodyweight,
}: {
  exercise: Exercise;
  planExercise: PlanExercise;
  lastSets: WorkoutSet[];
  bodyweight?: number | null;
}): ProgressionResult {
  const increment = incrementFor(exercise, planExercise);
  const { sets, repMin, repMax } = planExercise;

  const working = lastSets.filter((s) => s.done).sort((a, b) => a.setIndex - b.setIndex);

  if (working.length === 0) {
    const start = suggestStartWeight({ exercise, planExercise, bodyweight, increment });
    return {
      targets: Array.from({ length: sets }, () => ({ weight: start, reps: repMin })),
      progressed: false,
      isFirstTime: true,
    };
  }

  const topWeight = Math.max(...working.map((s) => s.weight));
  // Nur die Sätze auf dem schwersten Gewicht zählen als Arbeitssätze —
  // Aufwärmsätze mit weniger Gewicht sollen die Progression nicht blockieren.
  const workingAtTop = working.filter((s) => s.weight === topWeight);
  // Erst wenn die volle geplante Satzzahl auf dem Topgewicht die Obergrenze
  // erreicht hat, steigt das Gewicht — eine abgebrochene Einheit mit einem
  // starken Satz soll die Progression nicht auslösen.
  const allAtCeiling =
    workingAtTop.length >= sets && workingAtTop.every((s) => s.reps >= repMax);

  if (allAtCeiling) {
    const next = roundToIncrement(topWeight + increment, increment);
    return {
      targets: Array.from({ length: sets }, () => ({ weight: next, reps: repMin })),
      progressed: true,
      isFirstTime: false,
    };
  }

  return {
    targets: Array.from({ length: sets }, (_, i) => {
      const previous = workingAtTop[i] ?? workingAtTop[workingAtTop.length - 1];
      const reps = previous ? Math.min(repMax, Math.max(repMin, previous.reps)) : repMin;
      return { weight: topWeight, reps };
    }),
    progressed: false,
    isFirstTime: false,
  };
}

function suggestStartWeight({
  exercise,
  planExercise,
  bodyweight,
  increment,
}: {
  exercise: Exercise;
  planExercise: PlanExercise;
  bodyweight?: number | null;
  increment: number;
}): number {
  if (planExercise.startWeight != null) return planExercise.startWeight;
  if (exercise.equipment === "bodyweight") return 0;
  if (!bodyweight || !exercise.bodyweightFactor) return 0;
  // Faustformeln zielen auf ein Gewicht, das für ~10 saubere Wiederholungen reicht.
  return Math.max(increment, roundToIncrement(bodyweight * exercise.bodyweightFactor, increment));
}

/** Epley — die gebräuchlichste 1RM-Schätzung. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function setVolume(set: WorkoutSet): number {
  return set.weight * set.reps;
}

export function sessionVolume(session: WorkoutSession): number {
  return session.sets.filter((s) => s.done).reduce((sum, s) => sum + setVolume(s), 0);
}

/**
 * Nächster Tag der Rotation: der Tag nach dem zuletzt trainierten.
 * Ist ein Wochentag fest zugewiesen und passt auf heute, gewinnt dieser.
 */
export function nextDayFor(
  plan: WorkoutPlan,
  lastSession: { dayId: string | null } | undefined,
  today = new Date()
): PlanDay | null {
  const days = [...plan.days].sort((a, b) => a.position - b.position);
  if (days.length === 0) return null;

  const todayIndex = (today.getDay() + 6) % 7;
  const scheduled = days.find((d) => d.weekday === todayIndex);
  if (scheduled) return scheduled;

  if (!lastSession?.dayId) return days[0];
  const lastIndex = days.findIndex((d) => d.id === lastSession.dayId);
  if (lastIndex === -1) return days[0];
  return days[(lastIndex + 1) % days.length];
}
