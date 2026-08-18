import { todayISO } from "@/lib/habits";

export function getPreviousWeekRange(referenceISO: string = todayISO()) {
  const ref = new Date(referenceISO + "T00:00:00");
  const dow = ref.getDay(); // 0 = Sonntag ... 6 = Samstag
  const daysSinceMonday = (dow + 6) % 7;
  const thisMonday = new Date(ref);
  thisMonday.setDate(ref.getDate() - daysSinceMonday);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  return { from: fmt(lastMonday), to: fmt(lastSunday), weekKey: fmt(lastMonday) };
}
