import type { Entry } from "@/lib/api-client";

export function dateRange(fromDaysAgo: number, toDaysAgo = 0): string[] {
  const dates: string[] = [];
  for (let i = fromDaysAgo; i >= toDaysAgo; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString("sv-SE"));
  }
  return dates;
}

export function entriesToMap(entries: Entry[]): Map<string, number> {
  return new Map(entries.map((e) => [e.date, e.value]));
}

/** Tage vom ältesten Eintrag bis heute — mehr Verlauf gibt es nicht herzugeben. */
function daysCovered(entries: Entry[]): number {
  if (entries.length === 0) return 0;
  const earliest = entries.reduce((min, e) => (e.date < min ? e.date : min), entries[0].date);
  const today = new Date().toLocaleDateString("sv-SE");
  const ms =
    new Date(`${today}T00:00:00`).getTime() - new Date(`${earliest}T00:00:00`).getTime();
  // Runden statt Abschneiden: die Zeitumstellung verschiebt den Abstand um eine Stunde.
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * rangeDays ist die Obergrenze, nicht das tatsächliche Fenster: gerechnet wird
 * höchstens so weit zurück, wie Einträge vorliegen. Sonst meldet "Rekord" eine
 * Zahl, die in Wahrheit vom Ladefenster des Aufrufers gedeckelt ist — ohne das
 * irgendwo zu sagen.
 */
export function computeStreaks(
  entries: Entry[],
  goal: number,
  rangeDays = 365
): { current: number; longest: number } {
  const map = entriesToMap(entries);
  const span = Math.min(rangeDays, daysCovered(entries));
  const days = dateRange(span - 1, 0);
  const met = days.map((d) => (map.get(d) ?? 0) >= goal);

  let longest = 0;
  let run = 0;
  for (const m of met) {
    run = m ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  let current = 0;
  let i = met.length - 1;
  if (i >= 0 && !met[i]) i--; // heutiger Tag noch offen -> Streak nicht abbrechen
  for (; i >= 0; i--) {
    if (met[i]) current++;
    else break;
  }

  return { current, longest };
}

export function sum(entries: Entry[]): number {
  return entries.reduce((acc, e) => acc + e.value, 0);
}

export function average(entries: Entry[], overDays: number): number {
  if (overDays === 0) return 0;
  return sum(entries) / overDays;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

export type MonthBucket = { key: string; label: string; year: number; month: number; days: number };

export function monthRange(months: number): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    buckets.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[month],
      year,
      month,
      days,
    });
  }
  return buckets;
}

export function monthlyTotal(entries: Entry[], bucket: MonthBucket): number {
  const prefix = bucket.key;
  return sum(entries.filter((e) => e.date.startsWith(prefix)));
}
