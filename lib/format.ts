const NUMBER_FORMAT = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return NUMBER_FORMAT.format(value);
}

/** Kompakt für große Zahlen in engen Karten: 12.400 -> 12,4k */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 10000) {
    return `${NUMBER_FORMAT.format(Math.round(value / 100) / 10)}k`;
  }
  return NUMBER_FORMAT.format(value);
}

export function formatSigned(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  const formatted = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: digits,
  }).format(Math.abs(rounded));
  if (rounded > 0) return `+${formatted}`;
  if (rounded < 0) return `−${formatted}`;
  return formatted;
}

export function formatPercentDelta(current: number, previous: number): string | null {
  if (!previous) return null;
  const change = ((current - previous) / previous) * 100;
  if (!Number.isFinite(change)) return null;
  return `${formatSigned(change, 1)} %`;
}

/** Sekunden als m:ss — für den Pausentimer. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatWeight(kg: number): string {
  return `${NUMBER_FORMAT.format(kg)} kg`;
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function weekdayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return WEEKDAYS[d.getDay()];
}

export function formatDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });
}
