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

export function computeStreaks(
  entries: Entry[],
  goal: number,
  rangeDays = 365
): { current: number; longest: number } {
  const map = entriesToMap(entries);
  const days = dateRange(rangeDays - 1, 0);
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
