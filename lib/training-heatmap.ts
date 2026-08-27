import { workingSets, type WorkoutSession } from "@/lib/training";

export type HeatmapDay = {
  date: string;
  /** Arbeitssätze an diesem Tag — Aufwärmsätze zählen nicht mit. */
  sets: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** Die Einheiten dieses Tages, damit ein Tippen irgendwo hinführt. */
  sessionIds: string[];
};

/**
 * Die Schwellen der vier Farbstufen: die Viertel aller Trainingstage im
 * Zeitraum.
 *
 * Bewusst nicht am stärksten Tag ausgerichtet. Eine einzelne lange Einheit
 * würde sonst jeden anderen Tag auf die unterste Stufe drücken, und die Karte
 * zeigte statt eines Jahres Training nur diesen einen Tag.
 */
export function levelMarks(counts: number[]): number[] {
  const sorted = counts.filter((c) => c > 0).sort((a, b) => a - b);
  // Unter vier Trainingstagen gibt es nichts in Viertel zu teilen. Dann bleibt
  // die Karte einfarbig, statt aus zwei Tagen einen Rangunterschied zu machen.
  if (sorted.length < 4) return [];
  // Über die Länge minus eins, damit der stärkste Tag über der obersten
  // Schwelle liegt und die vierte Stufe überhaupt vorkommt.
  const at = (q: number) => sorted[Math.floor((sorted.length - 1) * q)];
  return [at(0.25), at(0.5), at(0.75)];
}

export function levelOf(sets: number, marks: number[]): 0 | 1 | 2 | 3 | 4 {
  if (sets <= 0) return 0;
  // Ohne Schwellen gibt es nichts zu vergleichen — dann ist jeder Tag, an dem
  // trainiert wurde, gleich viel wert.
  if (marks.length === 0) return 4;
  if (sets <= marks[0]) return 1;
  if (sets <= marks[1]) return 2;
  if (sets <= marks[2]) return 3;
  return 4;
}

/** Ein Tag als ISO-Datum in Ortszeit. */
function isoOf(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

/**
 * Die Tage der Heatmap, ältester zuerst. Der Zeitraum endet heute und beginnt
 * am Montag der Woche, die `days` Tage zurückliegt — so sind alle Spalten voll
 * und keine fängt mitten in der Woche an.
 */
export function heatmapDays(
  sessions: WorkoutSession[],
  days: number,
  today: Date = new Date()
): HeatmapDay[] {
  const setsByDate = new Map<string, number>();
  const idsByDate = new Map<string, string[]>();
  for (const session of sessions) {
    setsByDate.set(
      session.date,
      (setsByDate.get(session.date) ?? 0) + workingSets(session.sets).length
    );
    idsByDate.set(session.date, [...(idsByDate.get(session.date) ?? []), session.id]);
  }

  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  // Auf den Montag davor zurück, damit jede Spalte eine ganze Woche ist.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const out: HeatmapDay[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = isoOf(d);
    out.push({ date, sets: setsByDate.get(date) ?? 0, level: 0, sessionIds: idsByDate.get(date) ?? [] });
  }

  const marks = levelMarks(out.map((d) => d.sets));
  return out.map((d) => ({ ...d, level: levelOf(d.sets, marks) }));
}
