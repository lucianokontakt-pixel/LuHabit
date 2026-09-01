import { formatNumber } from "@/lib/format";

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

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "ball"
  | "other";

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

/**
 * Die Untergruppen innerhalb einer Muskelgruppe.
 *
 * Nur vier der zehn Gruppen zerfallen sinnvoll weiter. Die anderen sechs sind
 * selbst schon Untergruppen — "Bizeps" weiter zu unterteilen hilft niemandem,
 * der vor einem Gerät steht. Deshalb gibt es hier keine vollständige Abdeckung
 * und soll es auch keine geben: Übungen ohne Region zeigen einfach ihre
 * Muskelgruppe.
 *
 * Woher der Wert kommt, steht in scripts/exercise-regionen.mjs — beim Rücken
 * aus dem Datensatz selbst, bei Brust, Schultern und Rumpf aus dem Namen.
 */
export type Region =
  | "chest-upper"
  | "chest-mid"
  | "chest-lower"
  | "delts-front"
  | "delts-side"
  | "delts-rear"
  | "lats"
  | "back-upper"
  | "traps"
  | "back-lower"
  | "abs"
  | "obliques";

/**
 * Reihenfolge wie am Körper: oben nach unten, vorn nach hinten.
 *
 * Zwei Beschriftungen je Region. Die lange steht in der Auswahl, wo sie für
 * sich allein verständlich sein muss. Die kurze steht in einer Liste, die
 * ohnehin schon nach Muskelgruppen sortiert ist — unter der Überschrift
 * „Brust“ ist „Mittlere Brust“ zur Hälfte Wiederholung, und die Hälfte fehlt
 * am anderen Ende der Zeile.
 */
export const REGIONS: { key: Region; muscle: Muscle; label: string; short: string }[] = [
  { key: "chest-upper", muscle: "chest", label: "Obere Brust", short: "oben" },
  { key: "chest-mid", muscle: "chest", label: "Mittlere Brust", short: "Mitte" },
  { key: "chest-lower", muscle: "chest", label: "Untere Brust", short: "unten" },
  { key: "delts-front", muscle: "shoulders", label: "Vordere Schulter", short: "vorne" },
  { key: "delts-side", muscle: "shoulders", label: "Seitliche Schulter", short: "seitlich" },
  { key: "delts-rear", muscle: "shoulders", label: "Hintere Schulter", short: "hinten" },
  { key: "lats", muscle: "back", label: "Lat", short: "Lat" },
  { key: "back-upper", muscle: "back", label: "Oberer Rücken", short: "oben" },
  { key: "traps", muscle: "back", label: "Nacken", short: "Nacken" },
  { key: "back-lower", muscle: "back", label: "Unterer Rücken", short: "unten" },
  { key: "abs", muscle: "core", label: "Bauch", short: "Bauch" },
  { key: "obliques", muscle: "core", label: "Seitlicher Bauch", short: "seitlich" },
];

export const REGION_LABELS: Record<Region, string> = Object.fromEntries(
  REGIONS.map((r) => [r.key, r.label])
) as Record<Region, string>;

/** Die Kurzform — nur dort, wo die Muskelgruppe schon danebensteht. */
export const REGION_SHORT: Record<Region, string> = Object.fromEntries(
  REGIONS.map((r) => [r.key, r.short])
) as Record<Region, string>;

/** Die Untergruppen einer Muskelgruppe — leer, wo es keine gibt. */
export function regionsFor(muscle: Muscle): { key: Region; label: string }[] {
  return REGIONS.filter((r) => r.muscle === muscle).map((r) => ({
    key: r.key,
    label: r.label,
  }));
}

/**
 * Die Beliebtheitsstufe, die eine eigene Übung bekommt.
 *
 * Wer sie selbst angelegt hat, will sie sehen — sonst hätte er sich die Mühe
 * gespart. Sie steht damit nie im ausgeblendeten Teil der Bibliothek.
 */
export const CUSTOM_RANK = 5;

/**
 * Ab dieser Stufe steht eine Übung standardmäßig in der Trefferliste.
 * Darunter braucht es den Schalter „Auch ungewöhnliche zeigen“.
 */
export const RANK_SICHTBAR_AB = 3;

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Langhantel",
  dumbbell: "Kurzhantel",
  machine: "Maschine",
  cable: "Kabelzug",
  bodyweight: "Körpergewicht",
  kettlebell: "Kettlebell",
  band: "Band",
  ball: "Ball",
  other: "Sonstiges",
};

/** Reihenfolge der Gerätefilter — das Übliche zuerst. */
export const EQUIPMENT: Equipment[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "ball",
  "other",
];

/**
 * Standard-Gewichtssprung: Oberkörper 2,5 kg, Unterkörper 5 kg.
 * Pro Übung und pro Plan-Eintrag überschreibbar.
 */
/**
 * Faustwert für eigene Eigengewichtsübungen — grob ein Liegestütz. Geteilt
 * zwischen Server und Client: legt jemand offline eine Eigengewichtsübung an,
 * muss derselbe Wert gelten wie später beim Abgleich, sonst springt der Wert
 * im Moment des Abgleichs sichtbar um.
 */
export const DEFAULT_BODYWEIGHT_LOAD = 0.65;

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
  /** Zum schnelleren Finden in Bibliothek und Übungswähler markiert. */
  favorite: boolean;
  /** Überschreibt defaultIncrement, falls gesetzt. */
  increment: number | null;
  /** Startgewicht-Vorschlag = Körpergewicht × Faktor. */
  bodyweightFactor: number | null;
  /**
   * Anteil des Körpergewichts, den die Übung tatsächlich bewegt — für das
   * Volumen. null heißt: kein Körpergewicht im Spiel, es zählt nur die Hantel.
   * Nicht zu verwechseln mit bodyweightFactor, der das Startgewicht schätzt.
   */
  loadFactor: number | null;
  /**
   * Wie die Übung zu Aufwärmsätzen steht. null heißt: die Automatik
   * entscheidet (siehe lib/warmup.ts) — 'always'/'never' überschreiben das.
   */
  warmup: "always" | "never" | null;
  /**
   * Kürzel der Mediendateien im Katalog — daraus werden GIF und Standbild
   * zusammengesetzt (siehe lib/exercise-catalog.ts). null bei selbst
   * angelegten Übungen, die keine Bilder haben.
   */
  media: string | null;
  /** Muskeln, die mitarbeiten. Nur zur Anzeige, nicht in der Statistik. */
  secondary: Muscle[];
  /** Der englische Originalname — die Suche findet Übungen auch darüber. */
  en: string | null;
  /** Untergruppe innerhalb der Muskelgruppe, oder null. Kommt aus dem Katalog. */
  region: Region | null;
  /** Beliebtheitsstufe 1–5 aus dem Katalog. Siehe scripts/exercise-beliebtheit.mjs. */
  rank: number;
  /**
   * Die selbst vergebene Stufe. Schlägt `rank`, wenn gesetzt — die Schätzung
   * aus dem Namen soll nie gegen ein Urteil stehen, das jemand gefällt hat.
   */
  rating: number | null;
};

/** Die Stufe, die zählt: das eigene Urteil, sonst die Schätzung. */
export function stufeVon(exercise: Pick<Exercise, "rank" | "rating">): number {
  return exercise.rating ?? exercise.rank;
}

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
  /** Angestrebte Einheiten pro Woche (null = kein Ziel gesetzt). */
  weeklyTarget: number | null;
  days: PlanDay[];
};

export type WorkoutSet = {
  id: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  done: boolean;
  /** Aufwärmsatz: wird protokolliert, zählt aber nirgends mit. */
  warmup: boolean;
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

/**
 * Die Sätze, die zählen: abgehakt und kein Aufwärmsatz.
 *
 * Ein Begriff für alle Auswertungen — Progression, Volumen, Sätze pro Woche,
 * Bestleistungen. Aufwärmsätze bleiben im Protokoll der Einheit sichtbar,
 * tauchen aber in keiner Kennzahl auf.
 */
export function workingSets<T extends { done: boolean; warmup: boolean }>(sets: T[]): T[] {
  return sets.filter((s) => s.done && !s.warmup);
}

export type ProgressionResult = {
  targets: SetTarget[];
  /** true, wenn die letzte Einheit die Obergrenze in allen Sätzen erreicht hat. */
  progressed: boolean;
  /**
   * Womit gesteigert wurde: mit Gewicht, oder — bei Eigengewichtsübungen ohne
   * Zusatzgewicht — mit einer weiteren Wiederholung.
   */
  progressionKind: "weight" | "reps" | null;
  /** Kein Verlauf vorhanden — Vorschlag stammt aus dem Körpergewicht. */
  isFirstTime: boolean;
  /**
   * Welche Regel entschieden hat. Die App zeigt sie immer an — ein Vorschlag,
   * den man nicht nachprüfen kann, ist einer, dem man aufhört zu vertrauen.
   */
  kind: "first" | "up" | "hold" | "ceiling";
  /** Die Begründung im Klartext, fertig zum Anzeigen. */
  why: string;
};

/**
 * Das Gewicht, auf dem tatsächlich gearbeitet wurde.
 *
 * Normalerweise das schwerste — leichtere Sätze davor sind Aufwärmsätze und
 * sollen die Progression nicht blockieren. Erreicht auf dem schwersten Gewicht
 * aber kein einziger Satz die Untergrenze, war es kein Arbeitsgewicht, sondern
 * ein gescheiterter Versuch: dann zählt das nächstniedrigere Gewicht, auf dem
 * wirklich gearbeitet wurde. Sonst schlüge die App nach einem Fehlversuch samt
 * Reduktion beim nächsten Mal stur wieder das gescheiterte Gewicht vor.
 *
 * Hat kein Gewicht die Untergrenze erreicht, bleibt es beim schwersten — dann
 * gibt es nichts Besseres abzuleiten.
 */
function workingWeight(working: WorkoutSet[], repMin: number): number {
  const weights = [...new Set(working.map((s) => s.weight))].sort((a, b) => b - a);
  const reached = weights.find((w) =>
    working.some((s) => s.weight === w && s.reps >= repMin)
  );
  return reached ?? weights[0];
}

/**
 * Ab hier ist noch eine Wiederholung keine Steigerung mehr, sondern eine Art,
 * den Abend zu verbringen: Sätze jenseits der zwanzig trainieren Ausdauer, nicht
 * Kraft. Weiter geht es dort nur mit Zusatzgewicht oder einer schwereren
 * Variante — und das ist eine Entscheidung für einen Menschen, keine für eine
 * Automatik.
 *
 * Ein Plan, dessen Obergrenze selbst über zwanzig liegt, endet ohnehin an ihr:
 * gewachsen wird hier immer von der erreichten Obergrenze aus.
 */
export const BODYWEIGHT_REP_CAP = 20;

/**
 * Double Progression: erst wenn ALLE Arbeitssätze die Obergrenze des
 * Wiederholungsbereichs erreicht haben, steigt das Gewicht — und der
 * Bereich beginnt wieder unten. Sonst bleibt alles stehen, wie es war.
 *
 * Bewusst kurz gehalten: Grundlage ist die letzte Einheit mit dieser Übung,
 * sonst nichts. Kein Zählen von Fehlschlägen über Einheiten hinweg und kein
 * Rückschritt aus der Automatik — ob jemand wirklich festhängt oder nur krank,
 * müde oder schlecht geschlafen war, weiß der Verlauf nicht. Eine Regel, die
 * man im Gym nicht in einem Satz nachrechnen kann, ist eine Regel, der man
 * aufhört zu vertrauen.
 */
export function computeTargets({
  exercise,
  planExercise,
  history,
  bodyweight,
}: {
  exercise: Exercise;
  planExercise: PlanExercise;
  /**
   * Alle Einheiten mit dieser Übung, älteste zuerst — je Eintrag die Sätze
   * dieser einen Einheit. Entschieden wird allein aus der letzten; der
   * Vorschlag wird jedes Mal neu daraus abgeleitet, es gibt keinen
   * gespeicherten Zähler, der aus dem Tritt geraten könnte.
   */
  history: WorkoutSet[][];
  bodyweight?: number | null;
}): ProgressionResult {
  const increment = incrementFor(exercise, planExercise);
  const { sets, repMin, repMax } = planExercise;

  const lastSets = history[history.length - 1] ?? [];
  const working = workingSets(lastSets).sort((a, b) => a.setIndex - b.setIndex);

  if (working.length === 0) {
    const start = suggestStartWeight({ exercise, planExercise, bodyweight, increment });
    return {
      targets: Array.from({ length: sets }, () => ({ weight: start, reps: repMin })),
      progressed: false,
      progressionKind: null,
      isFirstTime: true,
      kind: "first",
      why: "Noch nichts protokolliert — diese Einheit setzt den Ausgangswert.",
    };
  }

  const topWeight = workingWeight(working, repMin);
  // Nur die Sätze auf dem Arbeitsgewicht zählen —
  // Aufwärmsätze mit weniger Gewicht sollen die Progression nicht blockieren.
  const workingAtTop = working.filter((s) => s.weight === topWeight);
  // Erst wenn die volle geplante Satzzahl auf dem Topgewicht die Obergrenze
  // erreicht hat, steigt das Gewicht — eine abgebrochene Einheit mit einem
  // starken Satz soll die Progression nicht auslösen.
  const allAtCeiling =
    workingAtTop.length >= sets && workingAtTop.every((s) => s.reps >= repMax);

  if (allAtCeiling) {
    // Der schwächste Satz auf dem Topgewicht gibt den Takt vor.
    const achieved = Math.min(...workingAtTop.map((s) => s.reps));

    // Ohne Zusatzgewicht (Klimmzüge, Dips, Liegestütze) wäre ein Sprung auf
    // 2,5 kg ein Vorschlag, den man im Gym erst mal nicht umsetzen kann.
    // Dort wächst stattdessen das Wiederholungsziel — Calisthenics-Logik.
    if (topWeight === 0) {
      // Vom tatsächlich Geschafften aus weiterzählen, nicht von repMax —
      // sonst bliebe das Ziel für immer bei repMax + 1 stehen.
      const nextReps = achieved + 1;

      // Nur bis zum Deckel. Darüber wächst nichts mehr von selbst; die App
      // sagt einmal, was jetzt dran wäre, und überlässt den Schritt dem
      // Menschen, der ihn machen muss.
      if (nextReps > BODYWEIGHT_REP_CAP) {
        return {
          targets: Array.from({ length: sets }, () => ({ weight: 0, reps: achieved })),
          progressed: false,
          progressionKind: null,
          isFirstTime: false,
          kind: "ceiling",
          why: `${sets} Sätze à ${achieved} — mehr Wiederholungen bringen hier wenig. Zusatzgewicht oder eine schwerere Variante?`,
        };
      }

      return {
        targets: Array.from({ length: sets }, () => ({ weight: 0, reps: nextReps })),
        progressed: true,
        progressionKind: "reps",
        isFirstTime: false,
        kind: "up",
        why: `${achieved} Wiederholungen in jedem Satz — diesmal ${nextReps}.`,
      };
    }

    // Die Sprunghöhe richtet sich danach, wie deutlich die Obergrenze
    // überschritten wurde.
    const next = retargetWeight({
      weight: topWeight,
      reps: achieved,
      targetReps: repMax,
      increment,
    });
    const jump = Math.round((next - topWeight) * 10) / 10;
    return {
      targets: Array.from({ length: sets }, () => ({ weight: next, reps: repMin })),
      progressed: true,
      progressionKind: "weight",
      isFirstTime: false,
      kind: "up",
      why:
        achieved > repMax
          ? `${achieved} Wiederholungen statt ${repMax} — ${formatNumber(jump)} kg mehr.`
          : `Obergrenze in jedem Satz erreicht — ${formatNumber(jump)} kg mehr.`,
    };
  }

  // Sonst bleibt stehen, was stand: dasselbe Gewicht, dasselbe Ziel je Satz.
  // Aufgesetzt wird auf den einzelnen Satz, nicht auf den schwächsten — aus
  // 12/10/8 wird wieder 12/10/8, nicht dreimal 8. Sätze fallen im Verlauf
  // einer Übung natürlich ab; das einzuebnen nähme dem ersten Satz seine
  // Leistung.
  const targets = Array.from({ length: sets }, (_, i) => {
    const previous = workingAtTop[i] ?? workingAtTop[workingAtTop.length - 1];
    // Bei Eigengewicht darf das Ziel über repMax hinausgewachsen sein.
    const ceiling = topWeight === 0 ? Math.max(repMax, previous?.reps ?? repMax) : repMax;
    const reps = previous ? Math.min(ceiling, Math.max(repMin, previous.reps)) : repMin;
    return { weight: topWeight, reps };
  });
  // Woran die Übung diesmal gemessen wird: die Obergrenze, bei Eigengewicht
  // das schon darüber gewachsene Ziel.
  const goal = targets.reduce((max, t) => Math.max(max, t.reps), repMax);
  return {
    targets,
    progressed: false,
    progressionKind: null,
    isFirstTime: false,
    kind: "hold",
    why:
      topWeight > 0
        ? `Nochmal ${formatNumber(topWeight)} kg — bis in jedem Satz ${goal} Wiederholungen stehen.`
        : `Wie beim letzten Mal — bis in jedem Satz ${goal} Wiederholungen stehen.`,
  };
}

/**
 * Der Übungsname ohne seinen Zusatz in Klammern: aus „Bankdrücken (breit,
 * Langhantel)" wird „Bankdrücken".
 *
 * Für Stellen, an denen der Name eine Marke ist und keine Auskunft — die
 * Pillen auf der Startseite etwa. Dort standen die vollen Namen, und weil
 * „Rumänisches Kreuzheben (Langhantel)" allein schon eine Zeile füllt, wurde
 * aus sechs Pillen ein sechszeiliger Block. Wer gleich startet, will den Tag
 * wiedererkennen, nicht die Stangenvariante nachlesen; die steht in der
 * Einheit selbst.
 *
 * Nur der letzte Klammerausdruck fällt weg, und nur wenn davor etwas
 * übrigbleibt: „(Band)" als ganzer Name wäre sonst plötzlich leer.
 */
export function kurzerName(name: string): string {
  const kurz = name.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return kurz || name;
}

/**
 * Beschriftung der Satz-Ziffern: Aufwärmsätze heißen „W", die Arbeitssätze
 * zählen davon unabhängig bei 1 los. Aus W, W, 1, 2, 3 wird also nicht
 * 1, 2, 3, 4, 5 — sonst wüsste niemand mehr, wie viele Arbeitssätze anstehen.
 */
export function setLabels(sets: { warmup: boolean }[]): string[] {
  let working = 0;
  return sets.map((s) => (s.warmup ? "W" : String(++working)));
}

/**
 * Was eine Übung in einer Einheit ergeben hat, als eine Zeile:
 * „57,5×10 · 57,5×9 · 57,5×10".
 *
 * Ohne Gewicht steht nur die Wiederholungszahl. „0×10" würde einen Satz ohne
 * Last behaupten und sagt nichts — bei Eigengewicht ist die Wiederholung die
 * ganze Leistung.
 */
/**
 * Der beste Wert, den eine Übung je gebracht hat — „32,5 kg" oder, wo es kein
 * Gewicht gibt, „12 Wdh".
 *
 * Bei Eigengewicht ohne Zusatzgewicht ist die Wiederholungszahl die ganze
 * Leistung; ein Bestwert von 0 kg wäre keine. Null, solange nichts
 * protokolliert ist. Aufwärmsätze bleiben außen vor.
 */
export function bestEffortLabel(history: WorkoutSet[][]): string | null {
  let weight = 0;
  let reps = 0;
  for (const session of history) {
    for (const s of workingSets(session)) {
      if (s.weight > weight) weight = s.weight;
      if (s.reps > reps) reps = s.reps;
    }
  }
  if (weight > 0) return `${formatNumber(weight)} kg`;
  if (reps > 0) return `${reps} Wdh`;
  return null;
}

export function formatLoggedSets(sets: { weight: number; reps: number }[]): string {
  return sets
    .map((s) => (s.weight > 0 ? `${formatNumber(s.weight)}×${s.reps}` : String(s.reps)))
    .join(" · ");
}

/**
 * Zielwerte auf die geplante Satzzahl ausrollen.
 *
 * Existiert, damit die Live-Session die Liste aus computeTargets vollständig
 * übernimmt statt nur ihren ersten Eintrag: nach 8/9/10 Wiederholungen muss
 * auch 8/9/10 vorgeschlagen werden. Dreimal die Acht wäre ein Rückschritt, den
 * ein abgehaktes Abnicken protokolliert — und der die Doppelprogression
 * dauerhaft festnageln würde, weil das nächste Ziel wieder von unten zählt.
 */
export function expandTargets(targets: SetTarget[], sets: number): SetTarget[] {
  if (targets.length === 0) return [];
  return Array.from(
    { length: Math.max(0, sets) },
    // Reicht die Liste nicht, gilt für die übrigen Sätze der letzte Eintrag.
    (_, i) => targets[i] ?? targets[targets.length - 1]
  );
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

/**
 * Epley — die gebräuchlichste 1RM-Schätzung. Ungedeckelt, weil die
 * Sprunghöhen-Rechnung in retargetWeight auch bei 20 Wiederholungen eine Zahl
 * braucht; fürs Anzeigen gibt es displayOneRepMax.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Oberhalb dieser Wiederholungszahl sagt eine 1RM-Schätzung mehr über
 * Ausdauer als über Maximalkraft, und die gängigen Formeln weichen zweistellig
 * voneinander ab.
 */
export const ONE_RM_REP_CAP = 12;

/**
 * Die 1RM-Schätzung zum Anzeigen — oder null, wenn sie nicht ehrlich zu
 * beantworten ist. Lieber keine Zahl als eine erfundene: aus 40 kg × 25 rechnet
 * Epley 73 kg, und das ist keine Aussage über irgendetwas.
 *
 * Eine einzelne Wiederholung ist keine Schätzung, sondern die Messung, und
 * kommt unverändert zurück.
 */
export function displayOneRepMax(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (weight <= 0 || reps < 1 || reps > ONE_RM_REP_CAP) return null;
  return Math.round(estimateOneRepMax(weight, Math.round(reps)) * 10) / 10;
}

/**
 * Höchstens so viele Gewichtssprünge auf einmal. Epley überschätzt bei sehr
 * hohen Wiederholungszahlen deutlich — ohne Deckel käme aus einem einzigen
 * versehentlich viel zu leichten Satz ein absurder Vorschlag.
 */
export const MAX_RETARGET_STEPS = 4;

/**
 * Das Gewicht, das zur gezeigten Leistung passt.
 *
 * Rechnet über Epley aus Gewicht und Wiederholungen das geschätzte Maximum und
 * daraus zurück, welches Gewicht auf `targetReps` Wiederholungen führen würde.
 * Wer die Obergrenze um eine Wiederholung überschreitet, steigt einen Sprung;
 * wer sie um zehn überschreitet, springt weiter, statt dem passenden Gewicht
 * über viele Einheiten hinterherzulaufen.
 *
 * Immer mindestens ein Sprung in die Richtung der Abweichung — bei genau
 * getroffener Obergrenze ergäbe die Formel sonst das Ausgangsgewicht und die
 * Progression stünde still.
 */
export function retargetWeight({
  weight,
  reps,
  targetReps,
  increment,
  maxSteps = MAX_RETARGET_STEPS,
}: {
  weight: number;
  reps: number;
  targetReps: number;
  increment: number;
  maxSteps?: number;
}): number {
  // Ohne Zusatzgewicht gibt es nichts zu verstellen — dort ist die
  // Wiederholung der einzige Hebel.
  if (weight <= 0 || reps <= 0 || targetReps <= 0 || increment <= 0) return weight;

  const ideal = estimateOneRepMax(weight, reps) / (1 + targetReps / 30);
  const rounded = roundToIncrement(ideal, increment);
  const up = reps >= targetReps;

  const lower = up ? weight + increment : Math.max(increment, weight - maxSteps * increment);
  const upper = up ? weight + maxSteps * increment : weight - increment;
  // Bei sehr kleinen Gewichten kann die Untergrenze über die Obergrenze
  // rutschen; dann gilt die Untergrenze.
  if (lower > upper) return lower;
  return Math.min(Math.max(rounded, lower), upper);
}

/** Ein Satz, wie er während der Einheit im Kopf des Nutzers steht. */
export type LoggedSet = { weight: number; reps: number; done: boolean; warmup?: boolean };

export type SetAdjustment = {
  /**
   * Woran geschraubt wird. Mit Zusatzgewicht am Gewicht, bei Eigengewicht an
   * den Wiederholungen — dort gibt es nichts anzuheben außer dem Ziel.
   */
  axis: "weight" | "reps";
  /** Nach oben, weil zu leicht — oder nach unten, weil zu schwer. */
  direction: "up" | "down";
  /** Der abgehakte Satz, der den Vorschlag ausgelöst hat (0-basiert). */
  index: number;
  /** Was in diesem Satz stand. */
  reps: number;
  weight: number;
  /** Der Wert, an dem gemessen wurde: die Grenze bzw. das Ziel der offenen Sätze. */
  targetReps: number;
  /** Was den restlichen Sätzen vorgeschlagen wird. */
  nextWeight: number;
  nextReps: number;
  /** Es gibt noch offene Sätze — sonst ginge es um einen zusätzlichen. */
  hasRemaining: boolean;
  /**
   * Ausgelöst von einer Aufwärmzeile. Dann geht es nicht um den Satz selbst,
   * sondern um das Gewicht, das für die Arbeitssätze steht.
   */
  warmup: boolean;
};

/**
 * Ab welchem Abstand zum anstehenden Ziel ein Wiederholungs-Vorschlag kommt.
 * Eine Wiederholung Unterschied ist normal — die Ziele wandern von Satz zu
 * Satz ohnehin (8/9/10). Erst ab zwei lohnt der Hinweis.
 */
export const REPS_SUGGESTION_GAP = 2;

/**
 * Reagiert auf den zuletzt abgehakten Satz einer Übung.
 *
 * Mit Zusatzgewicht: lag er über der Obergrenze, war das Gewicht zu leicht;
 * lag er unter der Untergrenze, zu schwer. Ohne Zusatzgewicht gibt es kein
 * Gewicht zu verstellen — dort wird das Wiederholungsziel der restlichen Sätze
 * an das angeglichen, was gerade tatsächlich ging.
 *
 * Beides betrifft nur die *restlichen* Sätze; ein abgehakter Satz bleibt immer
 * stehen, wie er protokolliert wurde. Gibt null zurück, wenn nichts zu raten ist.
 */
export function suggestAdjustment({
  sets,
  repMin,
  repMax,
  increment,
  warmupTarget,
}: {
  sets: LoggedSet[];
  repMin: number;
  repMax: number;
  increment: number;
  /**
   * Wofür die Rampe gedacht war: welcher Anteil des Arbeitsgewichts und wie
   * viele Wiederholungen (siehe lib/warmup.ts). Ohne diese Angabe bleiben
   * Aufwärmzeilen stumm — die Werte kommen von der Seite, die die Rampe auch
   * gesetzt hat, statt dass diese Datei sie sich zurückrechnet.
   */
  warmupTarget?: { percent: number; reps: number };
}): SetAdjustment | null {
  // Der jüngste abgehakte Satz zählt, nicht der erste — wer mittendrin
  // nachjustiert, bekommt den Vorschlag zum aktuellen Stand.
  // Aufwärmsätze bleiben außen vor: dass die Rampe leicht war, ist der Sinn
  // der Rampe und kein Grund, am Arbeitsgewicht zu drehen.
  let index = -1;
  for (let i = sets.length - 1; i >= 0; i--) {
    if (sets[i].done && !sets[i].warmup) {
      index = i;
      break;
    }
  }
  // Steht noch kein Arbeitssatz, kann höchstens die Rampe etwas verraten.
  if (index === -1) return warmupSuggestion({ sets, increment, warmupTarget });

  const set = sets[index];
  if (set.reps <= 0) return null;

  const open = sets.filter((s, i) => i > index && !s.done && !s.warmup);
  const hasRemaining = open.length > 0;

  if (set.weight <= 0) {
    return repsSuggestion({ set, index, open, hasRemaining, repMax });
  }

  // Die Obergrenze zu *erreichen* zählt schon, nicht erst sie zu überschreiten.
  // Vorher stand hier `>`: wer in einem 12–20-Plan zwanzig Wiederholungen
  // machte, bekam nichts zu sehen — der Satz war ja auf dem Ziel. Nur ist ein
  // erreichtes Ziel genau der Moment, in dem etwas passieren soll; dass das
  // erst die nächste Einheit betraf, war im Gym nicht zu erkennen und las sich
  // wie ein Fehler. retargetWeight sorgt dafür, dass dabei mindestens ein
  // Sprung herauskommt, auch wenn die Formel bei genau getroffener Grenze das
  // Ausgangsgewicht ergäbe.
  const direction: "up" | "down" | null =
    set.reps >= repMax ? "up" : set.reps < repMin ? "down" : null;
  if (!direction) return null;

  const targetReps = direction === "up" ? repMax : repMin;
  const nextWeight = retargetWeight({ weight: set.weight, reps: set.reps, targetReps, increment });
  if (nextWeight === set.weight) return null;

  // Nach unten ohne offene Sätze gäbe es nichts zu tun — einen zusätzlichen
  // Satz mit weniger Gewicht will niemand angeboten bekommen.
  if (!hasRemaining && direction === "down") return null;

  return {
    axis: "weight",
    direction,
    index,
    reps: set.reps,
    weight: set.weight,
    targetReps,
    nextWeight,
    // Nach einem Gewichtssprung beginnt der Wiederholungsbereich wieder unten.
    nextReps: repMin,
    hasRemaining,
    warmup: false,
  };
}

/**
 * Eigengewicht: gemessen wird nicht an der Planobergrenze, sondern am Ziel der
 * Sätze, die noch anstehen. Bei Klimmzügen darf dieses Ziel über die
 * Obergrenze hinausgewachsen sein — dann ist repMax kein Maßstab mehr.
 */
function repsSuggestion({
  set,
  index,
  open,
  hasRemaining,
  repMax,
}: {
  set: LoggedSet;
  index: number;
  open: LoggedSet[];
  hasRemaining: boolean;
  repMax: number;
}): SetAdjustment | null {
  // Ohne offene Sätze lohnt nur der starke Fall: einen Satz dranhängen, wenn
  // die Obergrenze erreicht ist. Dieselbe Grenze wie oben — auch hier zählt
  // das Erreichen, nicht erst das Überschreiten.
  if (!hasRemaining) {
    if (set.reps < repMax) return null;
    return {
      axis: "reps",
      direction: "up",
      index,
      reps: set.reps,
      weight: 0,
      targetReps: repMax,
      nextWeight: 0,
      nextReps: set.reps,
      hasRemaining: false,
      warmup: false,
    };
  }

  const queued = open[0].reps;
  const gap = set.reps - queued;
  if (Math.abs(gap) < REPS_SUGGESTION_GAP) return null;

  return {
    axis: "reps",
    direction: gap > 0 ? "up" : "down",
    index,
    reps: set.reps,
    weight: 0,
    targetReps: queued,
    nextWeight: 0,
    nextReps: set.reps,
    hasRemaining: true,
    warmup: false,
  };
}

/**
 * Ab dem Wievielfachen der vorgesehenen Wiederholungen eine Aufwärmzeile keine
 * mehr ist. Beim Doppelten — 16 statt 8 — war das kein Aufwärmen, sondern ein
 * Satz auf zu leichtem Gewicht.
 */
export const WARMUP_WORK_FACTOR = 2;

/**
 * Was eine Aufwärmzeile über das Arbeitsgewicht verrät.
 *
 * Normalerweise nichts: dass die Rampe leicht war, ist ihr Sinn, und dieselbe
 * Zeile mit ein paar Wiederholungen mehr bleibt eine Rampe. Wer aber das
 * Doppelte der vorgesehenen Wiederholungen macht — 30 statt 8 —, hat keinen
 * Aufwärmsatz protokolliert, sondern gezeigt, dass das Gewicht zu leicht steht.
 *
 * Gerechnet wird über den Zweck der Rampe, nicht über die Physiologie: welches
 * Gewicht hätte für diese Leistung auf der Rampe stehen müssen, und welches
 * Arbeitsgewicht gehört zu so einer Rampe. Der Weg über Epley allein trüge
 * nicht — ein langer Satz auf halbem Gewicht schätzt sich schwächer als der
 * geplante Arbeitssatz und könnte ihn nie anheben.
 *
 * Nach unten sagt die Rampe nie etwas: eine leichte Rampe ist kein Grund, das
 * Arbeitsgewicht zu senken.
 */
function warmupSuggestion({
  sets,
  increment,
  warmupTarget,
}: {
  sets: LoggedSet[];
  increment: number;
  warmupTarget?: { percent: number; reps: number };
}): SetAdjustment | null {
  if (!warmupTarget || warmupTarget.percent <= 0 || warmupTarget.reps <= 0) return null;
  if (increment <= 0) return null;

  let index = -1;
  for (let i = sets.length - 1; i >= 0; i--) {
    if (sets[i].done && sets[i].warmup) {
      index = i;
      break;
    }
  }
  if (index === -1) return null;

  const set = sets[index];
  if (set.weight <= 0 || set.reps <= 0) return null;
  // Solange es eine Rampe sein könnte, ist es eine.
  if (set.reps < warmupTarget.reps * WARMUP_WORK_FACTOR) return null;

  const open = sets.filter((s, i) => i > index && !s.done && !s.warmup);
  if (open.length === 0) return null;

  const planned = open[0].weight;
  const targetReps = open[0].reps;
  if (planned <= 0 || targetReps <= 0) return null;

  // Das Gewicht, das für diese Leistung auf der Rampe hätte stehen müssen —
  // und daraus das Arbeitsgewicht, dessen Rampe das gewesen wäre.
  const rampShouldBe = retargetWeight({
    weight: set.weight,
    reps: set.reps,
    targetReps: warmupTarget.reps,
    increment,
  });
  const implied = roundToIncrement(rampShouldBe / warmupTarget.percent, increment);
  // Derselbe Deckel wie überall: höchstens vier Sprünge auf einmal.
  const nextWeight = Math.min(implied, planned + MAX_RETARGET_STEPS * increment);
  if (nextWeight < planned + increment) return null;

  return {
    axis: "weight",
    direction: "up",
    index,
    reps: set.reps,
    weight: set.weight,
    targetReps: warmupTarget.reps,
    nextWeight,
    // Das Wiederholungsziel der Arbeitssätze bleibt, wonach gerechnet wurde.
    nextReps: targetReps,
    hasRemaining: true,
    warmup: true,
  };
}

/**
 * Was ein Satz wirklich bewegt: Zusatzgewicht plus den Anteil des
 * Körpergewichts, den die Übung trägt. Ohne bekanntes Körpergewicht oder ohne
 * Faktor bleibt es beim Zusatzgewicht — so wie es vorher überall war.
 *
 * Nur fürs Volumen. Die Progression rechnet weiter mit dem Zusatzgewicht,
 * sonst verlören Klimmzüge ihre Wiederholungsprogression.
 */
export function effectiveLoad(
  set: { weight: number },
  exercise: Exercise | undefined,
  bodyweight: number | null
): number {
  const factor = exercise?.loadFactor;
  if (!factor || !bodyweight || bodyweight <= 0) return set.weight;
  return set.weight + factor * bodyweight;
}

/** Der zuletzt an oder vor diesem Tag gemessene Wert. */
export function measuredOn(
  date: string,
  entries: { date: string; value: number }[]
): number | null {
  let found: number | null = null;
  for (const entry of entries) {
    if (entry.date > date) continue;
    // entries kommen aufsteigend; der letzte passende gewinnt.
    found = entry.value;
  }
  return found;
}

export function setVolume(
  set: WorkoutSet,
  exercise?: Exercise,
  bodyweight: number | null = null
): number {
  return effectiveLoad(set, exercise, bodyweight) * set.reps;
}

export function sessionVolume(
  session: WorkoutSession,
  exerciseById: Record<string, Exercise> = {},
  bodyweight: number | null = null
): number {
  return workingSets(session.sets).reduce(
    (sum, s) => sum + setVolume(s, exerciseById[s.exerciseId], bodyweight),
    0
  );
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
