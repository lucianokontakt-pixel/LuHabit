import {
  effectiveLoad,
  measuredOn,
  workingSets,
  type Exercise,
  type WorkoutSession,
} from "@/lib/training";
import { recentWeeks, weekStartISO } from "@/lib/muscle-stats";

export type TrainingWeek = {
  start: string;
  label: string;
  /** Trainierte Tage in dieser Woche — zwei Einheiten am selben Tag zählen als einer. */
  sessions: number;
  volume: number;
  sets: number;
  /** Ob das Wochenziel in dieser Woche erreicht wurde. Ohne Ziel immer false. */
  goalMet: boolean;
};

export type TrainingWeekSummary = {
  /** Aufsteigend, eine Zeile je Woche im Fenster, die laufende Woche zuletzt. */
  weeks: TrainingWeek[];
  /**
   * Wochen in Folge mit erreichtem Ziel. Die laufende Woche bricht die Serie
   * nicht, solange sie noch offen ist — genau wie bei den Tages-Habits.
   */
  currentStreak: number;
  longestStreak: number;
  thisWeekCount: number;
  weeklyTarget: number | null;
  trainedToday: boolean;
  /** Schnitt der abgeschlossenen Wochen — Basis wie bei muscleProgress. */
  averageSessionsPerWeek: number;
  volumeThisWeek: number;
  setsThisWeek: number;
  /** Veränderung zur Vorwoche in Prozent, null ohne Vergleichswert. */
  volumeDeltaPercent: number | null;
};

function toISO(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

function weekLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Der übergeordnete Trainings-Habit: Frequenz, Volumen und Serie über die
 * letzten Wochen. Anders als die Tages-Habits misst er nicht in Tagen,
 * sondern in Kalenderwochen gegen das Wochenziel des aktiven Plans — sonst
 * risse an jedem geplanten Ruhetag die Serie.
 */
export function trainingWeekSummary(
  sessions: WorkoutSession[],
  exerciseById: Record<string, Exercise>,
  weeklyTarget: number | null,
  weekCount = 12,
  today = new Date(),
  /** Gemessene Körpergewichte, aufsteigend — für Eigengewichtsübungen. */
  weights: { date: string; value: number }[] = []
): TrainingWeekSummary {
  const weeks = recentWeeks(weekCount, today);
  const windowStart = weeks[0];
  const todayISO = toISO(today);

  const buckets = new Map<string, { dates: Set<string>; volume: number; sets: number }>();
  for (const start of weeks) buckets.set(start, { dates: new Set(), volume: 0, sets: 0 });

  let trainedToday = false;

  for (const session of sessions) {
    if (session.date === todayISO) trainedToday = true;
    if (session.date < windowStart || session.date > todayISO) continue;
    const bucket = buckets.get(weekStartISO(session.date));
    if (!bucket) continue;

    bucket.dates.add(session.date);
    const bodyweight = measuredOn(session.date, weights);
    for (const set of workingSets(session.sets)) {
      bucket.sets += 1;
      bucket.volume += effectiveLoad(set, exerciseById[set.exerciseId], bodyweight) * set.reps;
    }
  }

  const rows: TrainingWeek[] = weeks.map((start) => {
    const bucket = buckets.get(start)!;
    return {
      start,
      label: weekLabel(start),
      sessions: bucket.dates.size,
      volume: bucket.volume,
      sets: bucket.sets,
      goalMet: weeklyTarget !== null && bucket.dates.size >= weeklyTarget,
    };
  });

  const currentWeek = rows[rows.length - 1];
  const thisWeekCount = currentWeek?.sessions ?? 0;

  // Wie bei den Tages-Streaks: die laufende Woche zählt nur mit, wenn sie
  // ihr Ziel schon erreicht hat — offen sein bricht die Serie nicht.
  let currentStreak = 0;
  let i = rows.length - 1;
  if (i >= 0 && !rows[i].goalMet) i--;
  for (; i >= 0; i--) {
    if (rows[i].goalMet) currentStreak++;
    else break;
  }

  let longestStreak = 0;
  let run = 0;
  for (const row of rows) {
    run = row.goalMet ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }

  // Schnitt aus abgeschlossenen Wochen ab der ersten mit Aktivität — die
  // laufende Woche ist noch nicht fertig und würde den Schnitt drücken.
  const completed = rows.slice(0, -1);
  const firstActive = completed.findIndex((w) => w.sessions > 0);
  const relevant = firstActive === -1 ? [] : completed.slice(firstActive);
  const averageSessionsPerWeek =
    relevant.length > 0
      ? Math.round((relevant.reduce((sum, w) => sum + w.sessions, 0) / relevant.length) * 10) / 10
      : thisWeekCount;

  const previousWeek = rows[rows.length - 2] ?? null;
  const volumeDeltaPercent =
    previousWeek && previousWeek.volume > 0
      ? Math.round(((currentWeek.volume - previousWeek.volume) / previousWeek.volume) * 1000) / 10
      : null;

  return {
    weeks: rows,
    currentStreak,
    longestStreak,
    thisWeekCount,
    weeklyTarget,
    trainedToday,
    averageSessionsPerWeek,
    volumeThisWeek: currentWeek?.volume ?? 0,
    setsThisWeek: currentWeek?.sets ?? 0,
    volumeDeltaPercent,
  };
}
