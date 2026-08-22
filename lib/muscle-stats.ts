import {
  MUSCLES,
  effectiveLoad,
  estimateOneRepMax,
  measuredOn,
  workingSets,
  type Exercise,
  type Muscle,
  type WorkoutSession,
} from "@/lib/training";

/**
 * Der Korridor, in dem Muskelaufbau zuverlässig stattfindet: rund 10 bis 20
 * harte Sätze pro Muskelgruppe und Woche. Darunter passiert wenig, darüber
 * wächst vor allem die Erschöpfung.
 *
 * Ein Satz zählt für die Muskelgruppe, der die Übung zugeordnet ist — die
 * Bibliothek kennt pro Übung genau eine. Nebenbeteiligung (Trizeps beim
 * Bankdrücken) bleibt damit außen vor; das ist die übliche und die ehrlichere
 * Zählweise, weil sie nichts schätzt.
 */
export const WEEKLY_SETS_MIN = 10;
export const WEEKLY_SETS_MAX = 20;

export type MuscleWeek = {
  /** Montag der Woche als ISO-Datum. */
  start: string;
  label: string;
  sets: number;
  volume: number;
  /** Bestes geschätztes Maximum dieser Woche in dieser Muskelgruppe. */
  oneRm: number;
};

export type MuscleStatus = "none" | "low" | "good" | "high";

export type MuscleProgress = {
  muscle: Muscle;
  label: string;
  /** Aufsteigend, eine Zeile je Woche im Fenster. */
  weeks: MuscleWeek[];
  /** Sätze in der laufenden Woche. */
  currentSets: number;
  /** Schnitt der abgeschlossenen Wochen — die Zahl, die zählt. */
  averageSets: number;
  /**
   * Woher averageSets kommt: aus abgeschlossenen Wochen ("average") oder — wenn
   * es die noch nicht gibt — aus der laufenden ("current"). Der Unterschied
   * gehört in die Beschriftung, sonst behauptet die Karte einen Schnitt, den
   * sie nicht hat.
   */
  basis: "average" | "current";
  totalSets: number;
  volume: number;
  bestOneRm: number;
  /** Veränderung des besten Maximums zwischen erster und letzter Woche mit Daten. */
  oneRmChange: number | null;
  lastTrained: string | null;
  daysSince: number | null;
  status: MuscleStatus;
};

function toISO(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

/** Montag der Woche, in der das Datum liegt. */
export function weekStartISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISO(d);
}

/** Die letzten n Wochenanfänge, aufsteigend, die laufende Woche zuletzt. */
export function recentWeeks(count: number, today = new Date()): string[] {
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weeks: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setDate(d.getDate() - i * 7);
    weeks.push(toISO(d));
  }
  return weeks;
}

function weekLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function statusFor(average: number): MuscleStatus {
  if (average <= 0) return "none";
  if (average < WEEKLY_SETS_MIN) return "low";
  if (average <= WEEKLY_SETS_MAX) return "good";
  return "high";
}

/**
 * Sätze, Volumen und Kraft je Muskelgruppe über die letzten Wochen. Jede
 * Muskelgruppe kommt vor, auch die nie trainierte — gerade die ist die
 * interessante Information.
 */
export function muscleProgress(
  sessions: WorkoutSession[],
  exerciseById: Record<string, Exercise>,
  weekCount = 12,
  today = new Date(),
  /** Gemessene Körpergewichte, aufsteigend — für Eigengewichtsübungen. */
  weights: { date: string; value: number }[] = []
): MuscleProgress[] {
  const weeks = recentWeeks(weekCount, today);
  const windowStart = weeks[0];
  const currentWeek = weeks[weeks.length - 1];
  const todayISO = toISO(today);

  // muscle -> weekStart -> Kennzahlen
  const buckets = new Map<Muscle, Map<string, MuscleWeek>>();
  const lastTrained = new Map<Muscle, string>();

  for (const m of MUSCLES) {
    const perWeek = new Map<string, MuscleWeek>();
    for (const start of weeks) {
      perWeek.set(start, { start, label: weekLabel(start), sets: 0, volume: 0, oneRm: 0 });
    }
    buckets.set(m.key, perWeek);
  }

  for (const session of sessions) {
    const bodyweight = measuredOn(session.date, weights);
    for (const set of workingSets(session.sets)) {
      const muscle = exerciseById[set.exerciseId]?.muscle;
      if (!muscle) continue;

      // Das letzte Training zählt über das ganze Fenster hinaus — sonst stünde
      // bei einer lange vernachlässigten Gruppe "noch nie" statt "vor 9 Wochen".
      const previous = lastTrained.get(muscle);
      if (!previous || session.date > previous) lastTrained.set(muscle, session.date);

      if (session.date < windowStart || session.date > todayISO) continue;
      const week = buckets.get(muscle)?.get(weekStartISO(session.date));
      if (!week) continue;

      week.sets += 1;
      week.volume += effectiveLoad(set, exerciseById[set.exerciseId], bodyweight) * set.reps;
      week.oneRm = Math.max(week.oneRm, Math.round(estimateOneRepMax(set.weight, set.reps) * 10) / 10);
    }
  }

  return MUSCLES.map((m) => {
    const perWeek = buckets.get(m.key)!;
    const rows = weeks.map((start) => perWeek.get(start)!);
    // Die laufende Woche ist noch nicht fertig und würde den Schnitt drücken.
    // Gezählt wird ab der ersten Woche mit Aktivität: Wochen vor dem ersten
    // Satz beschreiben nur die Fensterbreite, Wochen danach sehr wohl die
    // Vernachlässigung.
    const completed = rows.slice(0, -1);
    const firstActive = completed.findIndex((w) => w.sets > 0);
    const relevant = firstActive === -1 ? [] : completed.slice(firstActive);
    // Wer erst diese Woche angefangen hat, hat keinen Schnitt — dann zählt
    // die laufende Woche, statt überall eine Null zu behaupten.
    const basis: "average" | "current" = relevant.length > 0 ? "average" : "current";
    const average =
      basis === "average"
        ? relevant.reduce((sum, w) => sum + w.sets, 0) / relevant.length
        : (rows[rows.length - 1]?.sets ?? 0);

    const withData = rows.filter((w) => w.oneRm > 0);
    const oneRmChange =
      withData.length > 1 ? withData[withData.length - 1].oneRm - withData[0].oneRm : null;

    const last = lastTrained.get(m.key) ?? null;
    const daysSince = last
      ? Math.round(
          (new Date(`${todayISO}T00:00:00`).getTime() - new Date(`${last}T00:00:00`).getTime()) /
            86_400_000
        )
      : null;

    return {
      muscle: m.key,
      label: m.label,
      weeks: rows,
      currentSets: perWeek.get(currentWeek)?.sets ?? 0,
      averageSets: Math.round(average * 10) / 10,
      basis,
      totalSets: rows.reduce((sum, w) => sum + w.sets, 0),
      volume: rows.reduce((sum, w) => sum + w.volume, 0),
      bestOneRm: rows.reduce((acc, w) => Math.max(acc, w.oneRm), 0),
      oneRmChange,
      lastTrained: last,
      daysSince,
      status: statusFor(average),
    };
  });
}
