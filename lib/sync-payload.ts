/**
 * Die Antwort von /api/sync in das übersetzen, was die App ohnehin benutzt.
 *
 * Bewusst ohne IndexedDB und ohne fetch: hier steckt die Logik, die still
 * falsch sein kann — Kindzeilen dem richtigen Elternteil zuordnen, Grabsteine
 * von echten Datensätzen trennen, kaputte JSON-Spalten überleben. Das gehört
 * unter Tests. Der Speicher drumherum ist eine dünne Hülle.
 *
 * Grundsatz bei kaputten Daten: eine unlesbare Zeile darf niemals den ganzen
 * Abgleich scheitern lassen. Ein Habit mit zerschossenem quick_add kommt lieber
 * mit Standardwerten an, als dass 500 andere Datensätze nicht ankommen.
 */

import type {
  Equipment,
  Muscle,
  PlanDay,
  PlanExercise,
  WorkoutPlan,
  WorkoutSession,
  WorkoutSet,
} from "@/lib/training";

type Row = Record<string, unknown>;

export type StoredEntry = { habit: string; date: string; value: number };
export type StoredExercise = {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  isCustom: boolean;
  hidden: boolean;
  increment: number | null;
  bodyweightFactor: number | null;
  loadFactor: number | null;
  warmup: "always" | "never" | null;
};
export type StoredBodyProfile = {
  age: number | null;
  gender: string | null;
  height: number | null;
  activity: string | null;
};

/**
 * Die Sammlungen, in denen ein Datensatz liegen kann. Muss zu DATA_STORES in
 * lib/local-db.ts passen.
 */
export type Collection = "entries" | "exercises" | "plans" | "sessions";

/**
 * Was der Abgleich geliefert hat, sortiert nach "einsortieren" und "entfernen".
 * Die Schlüssel in `removed` sind dieselben, unter denen die Datensätze
 * gespeichert liegen — bei Körperwerten also messwert|datum, sonst die ID.
 *
 * `sortKeys` hält je Datensatz die Zeichenkette, nach der die Sammlung sortiert
 * wird. Sie steht getrennt, weil sie Felder braucht, die es in den
 * Domänenobjekten nicht gibt: Einheiten nach Datum UND Startzeit. Ohne die Startzeit wäre bei zwei Einheiten am selben Tag
 * offen, welche die jüngere ist — und genau darauf stützt sich die Progression,
 * wenn sie die zuletzt protokollierten Sätze einer Übung sucht.
 */
export type SyncSnapshot = {
  cursor: string;
  full: boolean;
  entries: StoredEntry[];
  exercises: StoredExercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  bodyProfile: StoredBodyProfile | null;
  removed: Record<Collection, string[]>;
  sortKeys: Record<Collection, Record<string, string>>;
};

/** Zahlen als Text sortieren nur richtig, wenn sie gleich lang sind. */
function pad(value: number): string {
  return String(Math.max(0, Math.round(value))).padStart(6, "0");
}

/** Der Schlüssel, unter dem ein Eintrag liegt: ein Habit an einem Tag. */
export function entryKey(habit: string, date: string): string {
  return `${habit}|${date}`;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bool(value: unknown): boolean {
  return value === 1 || value === true;
}

function isDeleted(row: Row): boolean {
  return row.deleted_at !== null && row.deleted_at !== undefined;
}

/**
 * Teilt eine Liste Rohzeilen in lebende und gelöschte. `key` bestimmt, unter
 * welchem Schlüssel ein gelöschter Datensatz zu entfernen ist.
 */
function split<T>(
  rows: Row[],
  key: (row: Row) => string,
  map: (row: Row) => T,
  sort: (row: Row) => string
): { live: T[]; removed: string[]; sortKeys: Record<string, string> } {
  const live: T[] = [];
  const removed: string[] = [];
  const sortKeys: Record<string, string> = {};
  for (const row of rows) {
    if (isDeleted(row)) {
      removed.push(key(row));
      continue;
    }
    live.push(map(row));
    sortKeys[key(row)] = sort(row);
  }
  return { live, removed, sortKeys };
}

function toPlanExercise(row: Row): PlanExercise {
  return {
    id: str(row.id),
    exerciseId: str(row.exercise_id),
    position: num(row.position),
    sets: num(row.sets, 3),
    repMin: num(row.rep_min, 8),
    repMax: num(row.rep_max, 12),
    restSeconds: num(row.rest_seconds, 120),
    increment: numOrNull(row.increment),
    startWeight: numOrNull(row.start_weight),
  };
}

function toWorkoutSet(row: Row): WorkoutSet {
  return {
    id: str(row.id),
    exerciseId: str(row.exercise_id),
    setIndex: num(row.set_index),
    weight: num(row.weight),
    reps: num(row.reps),
    done: bool(row.done),
    warmup: bool(row.warmup),
  };
}

/** Die Kindzeilen nach ihrem Elternteil gruppieren. */
function groupBy<T>(rows: Row[], parent: (row: Row) => string, map: (row: Row) => T) {
  const byParent = new Map<string, T[]>();
  for (const row of rows) {
    const id = parent(row);
    const list = byParent.get(id) ?? [];
    list.push(map(row));
    byParent.set(id, list);
  }
  return byParent;
}

export function readSyncPayload(payload: unknown): SyncSnapshot {
  const p = (payload ?? {}) as Row;
  const rows = (key: string): Row[] => (Array.isArray(p[key]) ? (p[key] as Row[]) : []);

  const entries = split(
    rows("entries"),
    (r) => entryKey(str(r.habit), str(r.date)),
    (r): StoredEntry => ({ habit: str(r.habit), date: str(r.date), value: num(r.value) }),
    // Route: ORDER BY date ASC
    (r) => str(r.date)
  );

  const exercises = split(
    rows("exercises"),
    (r) => str(r.id),
    (r): StoredExercise => ({
      id: str(r.id),
      name: str(r.name),
      muscle: str(r.muscle) as Muscle,
      equipment: str(r.equipment) as Equipment,
      isCustom: bool(r.is_custom),
      hidden: bool(r.hidden),
      increment: numOrNull(r.increment),
      bodyweightFactor: numOrNull(r.bodyweight_factor),
      loadFactor: numOrNull(r.load_factor),
      warmup: r.warmup === "always" || r.warmup === "never" ? r.warmup : null,
    }),
    // Route: ORDER BY name COLLATE NOCASE ASC
    (r) => str(r.name).toLowerCase()
  );

  // Pläne sind Dokumente: Tage hängen am Plan, Übungen am Tag.
  const exercisesByDay = groupBy(rows("planExercises"), (r) => str(r.day_id), toPlanExercise);
  const daysByPlan = groupBy(
    rows("planDays"),
    (r) => str(r.plan_id),
    (r): PlanDay => ({
      id: str(r.id),
      name: str(r.name),
      position: num(r.position),
      weekday: numOrNull(r.weekday),
      exercises: (exercisesByDay.get(str(r.id)) ?? []).sort((a, b) => a.position - b.position),
    })
  );

  const plans = split(
    rows("plans"),
    (r) => str(r.id),
    (r): WorkoutPlan => ({
      id: str(r.id),
      name: str(r.name),
      isActive: bool(r.is_active),
      position: num(r.position),
      weeklyTarget: numOrNull(r.weekly_target),
      days: (daysByPlan.get(str(r.id)) ?? []).sort((a, b) => a.position - b.position),
    }),
    // Route: ORDER BY position ASC, created_at ASC
    (r) => `${pad(num(r.position))}|${str(r.created_at)}`
  );

  const setsBySession = groupBy(rows("sets"), (r) => str(r.session_id), toWorkoutSet);

  const sessions = split(
    rows("sessions"),
    (r) => str(r.id),
    (r): WorkoutSession => ({
      id: str(r.id),
      planId: r.plan_id === null || r.plan_id === undefined ? null : str(r.plan_id),
      dayId: r.day_id === null || r.day_id === undefined ? null : str(r.day_id),
      dayName: str(r.day_name, "Training"),
      date: str(r.date),
      durationSeconds: numOrNull(r.duration_seconds),
      note: r.note === null || r.note === undefined ? null : str(r.note),
      sets: (setsBySession.get(str(r.id)) ?? []).sort((a, b) => a.setIndex - b.setIndex),
    }),
    // Route: ORDER BY date DESC, started_at DESC — gelesen wird absteigend.
    // Die Startzeit entscheidet bei zwei Einheiten am selben Tag, welche die
    // jüngere ist; die Progression hängt daran.
    (r) => `${str(r.date)}|${str(r.started_at)}`
  );

  const profileRow = (p.bodyProfile ?? null) as Row | null;

  return {
    cursor: str(p.now),
    full: p.full === true,
    entries: entries.live,
    exercises: exercises.live,
    plans: plans.live,
    sessions: sessions.live,
    bodyProfile: profileRow
      ? {
          age: numOrNull(profileRow.age),
          gender: profileRow.gender === null || profileRow.gender === undefined
            ? null
            : str(profileRow.gender),
          height: numOrNull(profileRow.height),
          activity: profileRow.activity === null || profileRow.activity === undefined
            ? null
            : str(profileRow.activity),
        }
      : null,
    removed: {
      entries: entries.removed,
      exercises: exercises.removed,
      plans: plans.removed,
      sessions: sessions.removed,
    },
    sortKeys: {
      entries: entries.sortKeys,
      exercises: exercises.sortKeys,
      plans: plans.sortKeys,
      sessions: sessions.sortKeys,
    },
  };
}
