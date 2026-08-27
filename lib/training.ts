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
  kind: "first" | "up" | "hold" | "deload" | "ceiling";
  /** Die Begründung im Klartext, fertig zum Anzeigen. */
  why: string;
  /** Wie viele Einheiten in Folge die Vorgabe verfehlt wurde. */
  stalls: number;
  /**
   * Gesetzt, wenn die Eigengewichts-Progression einen Satz mehr vorsieht.
   * Sonst bleibt es bei der geplanten Satzzahl.
   */
  sets?: number;
  /**
   * Das Gewicht, auf das ein Rückschritt ginge — gesetzt, sobald genug
   * Einheiten in Folge verfehlt wurden. Die Vorgabe selbst bleibt davon
   * unberührt: den Schritt macht ein Knopfdruck, nicht die App.
   */
  deload?: number | null;
};

/**
 * Nach wie vielen verfehlten Einheiten in Folge zurückgegangen wird. Zweimal
 * darf es schiefgehen — beim dritten Mal liegt es nicht mehr am Tag.
 */
export const DELOAD_AFTER = 3;

/**
 * Ab hier ist noch ein Satz Liegestütze keine Steigerung mehr, sondern eine
 * Art, den Abend zu verbringen. Danach hilft nur Zusatzgewicht oder eine
 * schwerere Variante — und das ist eine Entscheidung für einen Menschen.
 */
export const MAX_BODYWEIGHT_SETS = 6;

/**
 * Wie eine vergangene Einheit für die Progression zu lesen ist.
 *
 * Ehrlich heißt streng: die Vorgabe gilt als erfüllt, wenn die volle geplante
 * Satzzahl auf dem Arbeitsgewicht stand und jeder dieser Sätze mindestens die
 * Untergrenze erreicht hat. Weniger Sätze als geplant zählt als verfehlt —
 * eine Einheit, die auseinandergefallen ist, darf die Last nie steigern.
 *
 * Gemessen wird gegen den *heutigen* Plan: LuHabit speichert die Vorgabe einer
 * Einheit nicht mit. Wer den Plan ändert, ändert damit rückwirkend die
 * Lesart der Historie — das ist der Preis dafür, dass nichts zurückgeschrieben
 * wird, und immer noch besser, als alte Einheiten gegen nichts zu messen.
 */
export function readSession(
  sets: WorkoutSet[],
  planExercise: Pick<PlanExercise, "sets" | "repMin">
): { ok: boolean; weight: number; lowestReps: number; sets: number } {
  const working = workingSets(sets);
  if (working.length === 0) {
    return { ok: false, weight: 0, lowestReps: 0, sets: 0 };
  }
  const weight = workingWeight(working, planExercise.repMin);
  const atTop = working.filter((s) => s.weight === weight);
  const lowestReps = Math.min(...atTop.map((s) => s.reps));
  return {
    ok: atTop.length >= planExercise.sets && lowestReps >= planExercise.repMin,
    weight,
    lowestReps,
    sets: atTop.length,
  };
}

/**
 * Wie viele Einheiten in Folge — von der jüngsten rückwärts — die Vorgabe
 * verfehlt haben.
 *
 * Bewusst nicht „seit wann steigt das Gewicht nicht mehr": wer sich bei
 * gleichem Gewicht von 8 auf 10 Wiederholungen hocharbeitet, macht genau das,
 * was Double Progression will. Das als Stillstand zu lesen und einen Deload
 * vorzuschlagen, wäre ein Fehlalarm mitten im Fortschritt.
 */
export function stallCount(
  history: WorkoutSet[][],
  planExercise: Pick<PlanExercise, "sets" | "repMin">
): number {
  let n = 0;
  // Bei i >= 1: die allererste Einheit mit einer Übung zählt nie als
  // Fehlschlag. Dort tastet man sich an ein Gewicht heran, statt eine Vorgabe
  // zu erfüllen — sonst stünde man nach zwei echten Fehlversuchen schon vor
  // einem Rückschritt, den nur das Kennenlernen ausgelöst hat.
  for (let i = history.length - 1; i >= 1; i--) {
    if (readSession(history[i], planExercise).ok) break;
    n++;
  }
  return n;
}

/**
 * Einmal zurückgehen, um wieder Anlauf nehmen zu können: 10 % runter, auf ein
 * ladbares Vielfaches gerundet. Hätte die Rundung nichts reduziert — bei
 * kleinen Gewichten liegt das nächste Vielfache oft auf dem Ausgangswert —
 * geht es stattdessen einen Sprung runter. Nie unter einen Sprung.
 */
export function deloadTo(weight: number, increment: number): number {
  if (increment <= 0) return weight;
  let next = roundToIncrement(weight * 0.9, increment);
  if (next >= weight) next = roundToIncrement(weight - increment, increment);
  return Math.max(increment, next);
}

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
 * Double Progression: erst wenn ALLE Arbeitssätze die Obergrenze des
 * Wiederholungsbereichs erreicht haben, steigt das Gewicht — und der
 * Bereich beginnt wieder unten. Sonst bleibt das Gewicht stehen und es
 * gilt, eine Wiederholung mehr zu schaffen.
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
   * dieser einen Einheit. Der Vorschlag wird jedes Mal neu daraus abgeleitet;
   * es gibt keinen gespeicherten Zähler, der aus dem Tritt geraten könnte.
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
      stalls: 0,
    };
  }

  const topWeight = workingWeight(working, repMin);

  // Die erste Einheit mit einer Übung ist eine Erkundung: man tastet sich an
  // ein Gewicht heran, statt eine Vorgabe zu erfüllen, die man noch gar nicht
  // hatte. Sie als Fehlschlag zu lesen wäre der schnellste Weg, das Vertrauen
  // in die Vorschläge zu verlieren — drei solcher Einheiten hintereinander
  // würden sogar einen Rückschritt auslösen, ohne dass je etwas misslungen
  // wäre. Gefunden ist das Gewicht trotzdem: von hier zählt der Plan.
  if (history.length === 1 && !readSession(lastSets, planExercise).ok) {
    return {
      targets: Array.from({ length: sets }, () => ({ weight: topWeight, reps: repMin })),
      progressed: false,
      progressionKind: null,
      isFirstTime: false,
      kind: "first",
      why:
        topWeight > 0
          ? `Beim ersten Mal rangetastet — diesmal ${formatNumber(topWeight)} kg von Anfang an.`
          : "Beim ersten Mal rangetastet — diesmal von Anfang an nach Plan.",
      stalls: 0,
    };
  }

  const stalls = stallCount(history, planExercise);
  // Nur die Sätze auf dem Arbeitsgewicht zählen —
  // Aufwärmsätze mit weniger Gewicht sollen die Progression nicht blockieren.
  const workingAtTop = working.filter((s) => s.weight === topWeight);
  // Erst wenn die volle geplante Satzzahl auf dem Topgewicht die Obergrenze
  // erreicht hat, steigt das Gewicht — eine abgebrochene Einheit mit einem
  // starken Satz soll die Progression nicht auslösen.
  const allAtCeiling =
    workingAtTop.length >= sets && workingAtTop.every((s) => s.reps >= repMax);

  if (allAtCeiling) {
    // Ohne Zusatzgewicht (Klimmzüge, Dips, Liegestütze) wäre ein Sprung auf
    // 2,5 kg ein Vorschlag, den man im Gym erst mal nicht umsetzen kann.
    // Dort wächst stattdessen das Wiederholungsziel — Calisthenics-Logik.
    if (topWeight === 0) {
      // Ohne Zusatzgewicht (Klimmzüge, Dips, Liegestütze) gibt es nichts
      // draufzulegen. Dort wächst stattdessen die Satzzahl: an der Obergrenze
      // des Bereichs kommt ein Satz dazu und die Wiederholungen fangen unten
      // wieder an — dieselbe Doppelprogression wie beim Gewicht, nur mit dem
      // einzigen Hebel, den es hier gibt.
      //
      // Der alte Weg — jedes Mal eine Wiederholung mehr — ist ein Plan bis
      // 30 Liegestütze und danach keiner mehr.
      const achieved = Math.min(...workingAtTop.map((s) => s.reps));
      const grown = Math.max(1, sets) + 1;

      if (grown <= MAX_BODYWEIGHT_SETS) {
        return {
          targets: Array.from({ length: grown }, () => ({ weight: 0, reps: repMin })),
          progressed: true,
          progressionKind: "reps",
          isFirstTime: false,
          kind: "up",
          why: `${achieved} Wiederholungen in jedem Satz — ein Satz mehr, zurück auf ${repMin}.`,
          stalls,
          sets: grown,
        };
      }

      // Mehr Volumen ist ab hier nicht mehr die Antwort. Zusatzgewicht oder
      // eine schwerere Variante wäre es — und das entscheidet kein
      // Automatismus, sondern ein Mensch.
      return {
        targets: Array.from({ length: sets }, () => ({ weight: 0, reps: achieved })),
        progressed: false,
        progressionKind: null,
        isFirstTime: false,
        kind: "ceiling",
        why: `${sets} Sätze à ${achieved} — Zeit für Zusatzgewicht oder eine schwerere Variante.`,
        stalls,
      };
    }

    // Die Sprunghöhe richtet sich danach, wie deutlich die Obergrenze
    // überschritten wurde. Der schwächste Satz auf dem Topgewicht gibt den
    // Takt vor — dieselbe konservative Regel wie im Zweig darüber.
    const achieved = Math.min(...workingAtTop.map((s) => s.reps));
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
      stalls,
    };
  }

  // Dreimal in Folge die Vorgabe verfehlt heißt: es liegt nicht am Tag. Einmal
  // zurückgehen und mit Schwung wieder heran ist der Ausweg aus einer Mauer,
  // gegen die man sonst noch wochenlang läuft.
  //
  // Vorgeschlagen, nicht vollzogen: ob jemand wirklich festhängt oder nur krank,
  // müde oder schlecht geschlafen war, weiß die Historie nicht. Das Gewicht
  // bleibt deshalb stehen und `deload` hält bereit, worauf ein Knopfdruck
  // zurückginge. Bei Eigengewicht gibt es nichts wegzunehmen.
  const deload = stalls >= DELOAD_AFTER && topWeight > 0 ? deloadTo(topWeight, increment) : null;
  if (deload !== null) {
    return {
      targets: Array.from({ length: sets }, () => ({ weight: topWeight, reps: repMin })),
      progressed: false,
      progressionKind: null,
      isFirstTime: false,
      kind: "deload",
      why: `${stalls} Einheiten auf ${formatNumber(topWeight)} kg — einmal zurück auf ${formatNumber(deload)} kg und neu anlaufen?`,
      stalls,
      deload,
    };
  }

  // Saß die letzte Einheit, aber noch nicht an der Obergrenze, ist der Weg nach
  // oben die Wiederholung — eine mehr in jedem Satz. Einfach zu wiederholen,
  // was schon stand, wäre kein Ziel, sondern eine Abschrift: wer 3 × 8 gemacht
  // hat und wieder 3 × 8 vorgeschlagen bekommt, kommt nie bei 12 an.
  //
  // Aufgesetzt wird dabei auf den einzelnen Satz, nicht auf den schwächsten:
  // aus 12/10/8 wird 12/11/9, nicht dreimal 9. Sätze fallen im Verlauf einer
  // Übung natürlich ab; das einzuebnen nähme dem ersten Satz seine Leistung.
  const climbing = stalls === 0;
  const targets = Array.from({ length: sets }, (_, i) => {
    const previous = workingAtTop[i] ?? workingAtTop[workingAtTop.length - 1];
    // Bei Eigengewicht darf das Ziel über repMax hinausgewachsen sein.
    const ceiling = topWeight === 0 ? Math.max(repMax, previous?.reps ?? repMax) : repMax;
    if (!previous) return { weight: topWeight, reps: repMin };
    const base = Math.max(repMin, previous.reps + (climbing ? 1 : 0));
    return { weight: topWeight, reps: Math.min(ceiling, base) };
  });
  return {
    targets,
    progressed: false,
    progressionKind: null,
    isFirstTime: false,
    kind: "hold",
    // Sachlich bleiben. Ein Zähler bis zum Rückschritt wäre Druck ohne Nutzen —
    // der Rückschritt erklärt sich selbst, wenn er kommt.
    why: climbing
      ? `Gleiches Gewicht — eine Wiederholung mehr pro Satz, bis überall ${repMax} steht.`
      : `Nochmal ${formatNumber(topWeight)} kg.`,
    stalls,
  };
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
}: {
  sets: LoggedSet[];
  repMin: number;
  repMax: number;
  increment: number;
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
  if (index === -1) return null;

  const set = sets[index];
  if (set.reps <= 0) return null;

  const open = sets.filter((s, i) => i > index && !s.done && !s.warmup);
  const hasRemaining = open.length > 0;

  if (set.weight <= 0) {
    return repsSuggestion({ set, index, open, hasRemaining, repMax });
  }

  const direction: "up" | "down" | null =
    set.reps > repMax ? "up" : set.reps < repMin ? "down" : null;
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
  // die Obergrenze klar gefallen ist.
  if (!hasRemaining) {
    if (set.reps <= repMax) return null;
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
