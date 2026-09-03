import {
  CUSTOM_RANK,
  DEFAULT_BODYWEIGHT_LOAD,
  type DayInput,
  type Equipment,
  type Exercise,
  type Ladeart,
  type Muscle,
  type PlanDay,
  type WorkoutPlan,
  type WorkoutSession,
  type WorkoutSet,
} from "@/lib/training";
import { readAll, readOne } from "@/lib/local-db";
import {
  catalogEntry,
  fromCatalog,
  mergeExercises,
  type ExerciseRecord,
} from "@/lib/exercise-catalog";
import { ensureLocalData } from "@/lib/sync";
import { enqueue, flushQueue } from "@/lib/write-queue";
import { dedupeSlug, slugifyExercise } from "@/lib/slugify";
import { newId } from "@/lib/ids";

/**
 * Einen Tag in die Form bringen, die updatePlan erwartet.
 *
 * updatePlan nimmt die Tage immer als vollständige Liste und baut sie neu auf.
 * Wer nur eine Übung anhängen will, muss den unveränderten Rest also mitsenden
 * — diese Umwandlung stand deshalb an zwei Stellen fast gleich da.
 */
export type DayLike = {
  name: string;
  weekday: number | null;
  /**
   * Nur die Vorgaben, keine IDs: der Plan-Editor arbeitet mit eigenen Zeilen
   * ohne id und position (EditExercise), und für updatePlan zählt ohnehin nur,
   * was hier steht — die Reihenfolge kommt aus dem Array.
   */
  exercises: readonly {
    exerciseId: string;
    sets: number;
    repMin: number;
    repMax: number;
    restSeconds: number;
    increment: number | null;
    startWeight: number | null;
  }[];
};

export function dayToInput(day: DayLike): DayInput {
  return {
    name: day.name,
    weekday: day.weekday,
    exercises: day.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets,
      repMin: e.repMin,
      repMax: e.repMax,
      restSeconds: e.restSeconds,
      increment: e.increment,
      startWeight: e.startWeight,
    })),
  };
}


/**
 * Der lokale Bestand hält nur noch, was von der Bibliothek abweicht — die
 * Bibliothek selbst kommt aus dem Katalog. Zusammengelegt sieht der Rest der
 * App weiterhin eine flache Liste (siehe lib/exercise-catalog.ts).
 */
export async function fetchExercises(): Promise<Exercise[]> {
  await ensureLocalData();
  return mergeExercises(await readAll<ExerciseRecord>("exercises"));
}

export async function createExercise(params: {
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  increment?: number | null;
  bodyweightFactor?: number | null;
  warmup?: "always" | "never" | null;
  favorite?: boolean;
}): Promise<Exercise> {
  const name = params.name.trim();
  const existing = await readAll<Exercise>("exercises");
  // Derselbe Bezeichner, den auch die Route vergäbe — siehe die gleiche
  // Begründung bei createCustomHabit in api-client.ts.
  const id = dedupeSlug(slugifyExercise(name), existing.map((e) => e.id));
  const loadFactor = params.equipment === "bodyweight" ? DEFAULT_BODYWEIGHT_LOAD : null;

  const exercise: Exercise = {
    id,
    name,
    muscle: params.muscle,
    equipment: params.equipment,
    isCustom: true,
    hidden: false,
    favorite: params.favorite ?? false,
    increment: params.increment ?? null,
    bodyweightFactor: params.bodyweightFactor ?? null,
    loadFactor,
    warmup: params.warmup ?? null,
    media: null,
    secondary: [],
    en: null,
    region: null,
    // Selbst angelegt heißt: gewollt. Volle Stufe, damit die Übung nicht im
    // ausgeblendeten Teil der Bibliothek landet.
    rank: CUSTOM_RANK,
    rating: null,
    ladeart: null,
  };
  await enqueue({ kind: "exercise.save", exercise, isNew: true });
  void flushQueue();
  return exercise;
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
  favorite?: boolean;
  rating?: number | null;
  ladeart?: Ladeart | null;
}): Promise<Exercise> {
  // Eine Katalogübung, die noch nie angefasst wurde, hat keine Zeile — ihre
  // Ausgangswerte kommen dann aus dem Katalog.
  const entry = catalogEntry(params.id);
  const before =
    (await readOne<Exercise>("exercises", params.id)) ??
    (entry ? fromCatalog(entry) : null);
  const exercise: Exercise = {
    id: params.id,
    name: params.name?.trim() || before?.name || "",
    muscle: params.muscle ?? before?.muscle ?? "chest",
    equipment: params.equipment ?? before?.equipment ?? "barbell",
    isCustom: before?.isCustom ?? true,
    hidden: params.hidden === undefined ? before?.hidden ?? false : params.hidden,
    favorite: params.favorite === undefined ? before?.favorite ?? false : params.favorite,
    increment: params.increment === undefined ? before?.increment ?? null : params.increment,
    bodyweightFactor:
      params.bodyweightFactor === undefined ? before?.bodyweightFactor ?? null : params.bodyweightFactor,
    loadFactor: params.loadFactor === undefined ? before?.loadFactor ?? null : params.loadFactor,
    warmup: params.warmup === undefined ? before?.warmup ?? null : params.warmup,
    media: before?.media ?? null,
    secondary: before?.secondary ?? [],
    en: before?.en ?? null,
    region: before?.region ?? entry?.region ?? null,
    rank: before?.rank ?? entry?.rank ?? CUSTOM_RANK,
    rating: params.rating === undefined ? before?.rating ?? null : params.rating,
    ladeart: params.ladeart === undefined ? before?.ladeart ?? null : params.ladeart,
  };
  await enqueue({ kind: "exercise.save", exercise, isNew: false });
  void flushQueue();
  return exercise;
}

/**
 * Übungen mit Verlauf werden nur ausgeblendet, nicht gelöscht — sonst verlöre
 * man die Statistik. Dieselbe Regel wie in der Route, hier gegen den lokalen
 * Bestand geprüft: Sätze in Einheiten und Vorkommen in Plänen sind schon da,
 * ganz ohne Netz.
 */
export async function deleteExercise(id: string): Promise<void> {
  const [sessions, plans] = await Promise.all([
    readAll<WorkoutSession>("sessions"),
    readAll<WorkoutPlan>("plans"),
  ]);
  const usedInSessions = sessions.some((s) => s.sets.some((set) => set.exerciseId === id));
  const usedInPlans = plans.some((p) => p.days.some((d) => d.exercises.some((e) => e.exerciseId === id)));

  // Eine Katalogübung lässt sich nicht löschen — sie steht im Code, nicht in
  // der Datenbank. Was hier "löschen" heißt, ist für sie immer ausblenden.
  if (usedInSessions || usedInPlans || catalogEntry(id)) {
    await updateExercise({ id, hidden: true });
    return;
  }
  await enqueue({ kind: "exercise.delete", id });
  void flushQueue();
}

export async function fetchPlans(): Promise<WorkoutPlan[]> {
  await ensureLocalData();
  return readAll<WorkoutPlan>("plans");
}

/**
 * Tage und Übungen eines Plans neu aufbauen — dieselbe Umformung, die die
 * Route serverseitig vornimmt (siehe writeDays in app/api/training/plans/route.ts).
 * Muss identisch bleiben, sonst zeigt ein offline angelegter Plan andere
 * Vorgaben (Satzzahl, Wiederholungsbereich, Pause) als der, den der Server
 * gleich daraus macht.
 */
function buildDays(days: DayInput[]): PlanDay[] {
  return days.map((day, dayIndex) => ({
    id: newId("day"),
    name: day.name.trim() || `Tag ${dayIndex + 1}`,
    position: dayIndex,
    weekday: day.weekday ?? null,
    exercises: day.exercises.map((ex, exIndex) => {
      const repMin = Math.max(1, ex.repMin ?? 8);
      return {
        id: newId("pe"),
        exerciseId: ex.exerciseId,
        position: exIndex,
        sets: Math.max(1, ex.sets ?? 3),
        repMin,
        // Obergrenze darf nie unter der Untergrenze liegen, sonst greift die
        // Progression nie und der Live-Modus zeigt widersprüchliche Ziele.
        repMax: Math.max(repMin, ex.repMax ?? 12),
        restSeconds: Math.max(0, ex.restSeconds ?? 120),
        increment: ex.increment ?? null,
        startWeight: ex.startWeight ?? null,
      };
    }),
  }));
}

export async function createPlan(params: {
  name?: string;
  days?: DayInput[];
  duplicateOf?: string;
  weeklyTarget?: number | null;
}): Promise<{ plan: WorkoutPlan; plans: WorkoutPlan[] }> {
  const existing = await readAll<WorkoutPlan>("plans");

  let name = params.name?.trim();
  let days = params.days ?? [];
  let weeklyTarget = params.weeklyTarget ?? null;

  if (params.duplicateOf) {
    const source = existing.find((p) => p.id === params.duplicateOf);
    if (!source) throw new Error("Vorlage nicht gefunden");
    name = name || `${source.name} (Kopie)`;
    weeklyTarget = params.weeklyTarget ?? source.weeklyTarget;
    days = source.days.map((d) => ({
      name: d.name,
      weekday: d.weekday,
      exercises: d.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets,
        repMin: e.repMin,
        repMax: e.repMax,
        restSeconds: e.restSeconds,
        increment: e.increment,
        startWeight: e.startWeight,
      })),
    }));
  }

  if (!name) throw new Error("name ist erforderlich");

  const plan: WorkoutPlan = {
    id: newId("plan"),
    name,
    // Der erste angelegte Plan wird automatisch aktiv — dieselbe Regel wie
    // serverseitig (position === 0 ? aktiv : nicht aktiv).
    isActive: existing.length === 0,
    position: existing.length,
    weeklyTarget,
    days: buildDays(days),
  };
  await enqueue({ kind: "plan.save", plan, isNew: true, daysChanged: true });
  void flushQueue();

  const plans = await readAll<WorkoutPlan>("plans");
  return { plan, plans };
}

export async function updatePlan(params: {
  id: string;
  name?: string;
  isActive?: boolean;
  days?: DayInput[];
  weeklyTarget?: number | null;
}): Promise<{ plan: WorkoutPlan; plans: WorkoutPlan[] }> {
  const before = await readOne<WorkoutPlan>("plans", params.id);
  if (!before) throw new Error("Plan nicht gefunden");

  const plan: WorkoutPlan = {
    id: params.id,
    name: params.name?.trim() || before.name,
    isActive: params.isActive === undefined ? before.isActive : params.isActive,
    position: before.position,
    weeklyTarget: params.weeklyTarget === undefined ? before.weeklyTarget : params.weeklyTarget,
    days: params.days ? buildDays(params.days) : before.days,
  };

  if (plan.isActive) {
    // Genau ein Plan ist aktiv — der bestimmt, was "Training starten"
    // vorschlägt. Die anderen einzeln deaktivieren, ohne ihre Tage
    // anzufassen (daysChanged: false).
    const others = (await readAll<WorkoutPlan>("plans")).filter(
      (p) => p.id !== params.id && p.isActive
    );
    for (const other of others) {
      await enqueue({
        kind: "plan.save",
        plan: { ...other, isActive: false },
        isNew: false,
        daysChanged: false,
      });
    }
  }

  await enqueue({ kind: "plan.save", plan, isNew: false, daysChanged: !!params.days });
  void flushQueue();

  const plans = await readAll<WorkoutPlan>("plans");
  return { plan, plans };
}

/**
 * Die Bewegung an einem einzelnen Platz im Plan austauschen — ohne dass sich
 * die ID des Tages oder einer anderen Übung verschiebt.
 *
 * updatePlan mit days wäre hier der falsche Weg: es schreibt beim Senden
 * IMMER alle Tage und Übungen des Plans neu (siehe writeDays in
 * app/api/training/plans/route.ts) und vergibt dabei frische IDs. Ruft eine
 * laufende Einheit das auf, verliert sie ihren eigenen Tag — der ist über
 * dessen ID gemerkt, und die wäre danach eine andere.
 */
export async function swapPlanExercise(params: {
  dayId: string;
  planExerciseId: string;
  exerciseId: string;
}): Promise<WorkoutPlan[]> {
  const plans = await readAll<WorkoutPlan>("plans");
  const plan = plans.find((p) => p.days.some((d) => d.id === params.dayId));
  if (!plan) throw new Error("Plan nicht gefunden");

  const nextPlan: WorkoutPlan = {
    ...plan,
    days: plan.days.map((d) =>
      d.id !== params.dayId
        ? d
        : {
            ...d,
            exercises: d.exercises.map((pe) =>
              pe.id === params.planExerciseId
                ? { ...pe, exerciseId: params.exerciseId, increment: null, startWeight: null }
                : pe
            ),
          }
    ),
  };

  await enqueue({
    kind: "planExercise.swap",
    plan: nextPlan,
    dayId: params.dayId,
    planExerciseId: params.planExerciseId,
    exerciseId: params.exerciseId,
  });
  void flushQueue();

  return readAll<WorkoutPlan>("plans");
}

/**
 * Absolvierte Einheiten bleiben erhalten — sie sind der Verlauf, nicht der
 * Plan. Bleibt nach dem Löschen kein aktiver Plan übrig, wird ein anderer
 * befördert, damit "Training starten" weiter etwas vorschlägt — dieselbe
 * Regel wie serverseitig, hier gegen den lokalen Bestand angewendet.
 */
export async function deletePlan(id: string): Promise<WorkoutPlan[]> {
  await enqueue({ kind: "plan.delete", id });

  const remaining = (await readAll<WorkoutPlan>("plans")).filter((p) => p.id !== id);
  if (remaining.length > 0 && !remaining.some((p) => p.isActive)) {
    const promoted = remaining[0];
    await enqueue({
      kind: "plan.save",
      plan: { ...promoted, isActive: true },
      isNew: false,
      daysChanged: false,
    });
  }
  void flushQueue();

  return readAll<WorkoutPlan>("plans");
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

function buildSets(
  sets: {
    exerciseId: string;
    setIndex: number;
    weight: number;
    reps: number;
    done?: boolean;
    warmup?: boolean;
  }[]
): WorkoutSet[] {
  return sets
    .filter((s) => s.exerciseId && s.reps > 0)
    .map((s) => ({
      id: newId("set"),
      exerciseId: s.exerciseId,
      setIndex: s.setIndex,
      weight: s.weight ?? 0,
      reps: s.reps,
      done: s.done === false ? false : true,
      warmup: !!s.warmup,
    }));
}

export async function saveSession(params: SessionInput): Promise<WorkoutSession> {
  const sets = buildSets(params.sets);
  if (sets.length === 0) {
    throw new Error("Eine Einheit braucht mindestens einen abgeschlossenen Satz");
  }

  const session: WorkoutSession = {
    id: newId("ws"),
    planId: params.planId ?? null,
    dayId: params.dayId ?? null,
    dayName: params.dayName.trim() || "Training",
    date: params.date || new Date().toLocaleDateString("sv-SE"),
    durationSeconds: params.durationSeconds ?? null,
    note: params.note?.trim() || null,
    sets,
  };
  await enqueue({ kind: "session.save", session, isNew: true });
  void flushQueue();

  return session;
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
}): Promise<WorkoutSession> {
  const before = await readOne<WorkoutSession>("sessions", params.id);
  if (!before) throw new Error("Einheit nicht gefunden");

  const sets = params.sets ? buildSets(params.sets) : before.sets;
  if (params.sets && sets.length === 0) {
    throw new Error("Eine Einheit braucht mindestens einen Satz — sonst lösch sie ganz");
  }

  const session: WorkoutSession = {
    id: params.id,
    planId: before.planId,
    dayId: before.dayId,
    dayName: params.dayName?.trim() || before.dayName,
    date: params.date || before.date,
    durationSeconds: params.durationSeconds === undefined ? before.durationSeconds : params.durationSeconds,
    note: params.note === undefined ? before.note : params.note?.trim() || null,
    sets,
  };
  await enqueue({ kind: "session.save", session, isNew: false });
  void flushQueue();

  return session;
}

export async function deleteSession(id: string): Promise<void> {
  await enqueue({ kind: "session.delete", id });
  void flushQueue();
}

/**
 * Eine gelöschte Einheit zurückholen — unverändert, mit ihrer alten Kennung.
 *
 * saveSession taugt dafür nicht: es vergibt immer eine frische ID, und die
 * zurückgeholte Einheit wäre eine andere als die gelöschte. Hier geht der
 * ursprüngliche Datensatz Wort für Wort zurück in die Warteschlange. Die steht
 * dann auf "erst löschen, dann wieder anlegen" und wird in dieser Reihenfolge
 * abgearbeitet — am Ende liegt die Zeile wieder da, wo sie war, auch wenn das
 * Löschen noch gar nicht rausgegangen war.
 */
export async function restoreSession(session: WorkoutSession): Promise<void> {
  await enqueue({ kind: "session.save", session, isNew: true });
  void flushQueue();
}
