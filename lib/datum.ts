/**
 * Kalendertage als ISO-Datum.
 *
 * Überall `toLocaleDateString("sv-SE")` statt `toISOString()`: Schweden schreibt
 * Daten als JJJJ-MM-TT, und die lokale Variante rechnet in der Zeitzone des
 * Geräts. `toISOString()` würde in UTC rechnen — wer um 23 Uhr trainiert, bekäme
 * dort schon den nächsten Tag protokolliert.
 */

/** Heute, in der Zeitzone des Geräts. */
export function todayISO(): string {
  return new Date().toLocaleDateString("sv-SE");
}

/** Der Tag vor n Tagen. `isoDateDaysAgo(0)` ist heute. */
export function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("sv-SE");
}

/**
 * Verschiebt ein ISO-Datum um n Tage — für die Tagesauswahl beim Nachtragen.
 * Rechnet bewusst über Date statt auf dem String, damit Monats-, Jahres- und
 * Sommerzeitwechsel richtig fallen.
 */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE");
}

/**
 * Ein Date als ISO-Tag. Dieselbe Regel wie oben, nur für ein Datum, das schon
 * dasteht — stand vorher als private Kopie in muscle-stats, training-weeks,
 * training-heatmap und progression.
 */
export function toISO(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

/**
 * Der Montag der Woche, in der dieses Datum liegt.
 *
 * `(getDay() + 6) % 7` verschiebt Sonntag von 0 auf 6, damit die Woche am
 * Montag beginnt statt am Sonntag. Die Zeile stand an fünf Stellen und ist
 * genau die Art Rechnung, die man beim Abschreiben einmal falsch abschreibt.
 */
export function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Der Wochentag als Index mit Montag = 0. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Ein ISO-Tag als kurze Beschriftung für Achsen: „02.09.".
 *
 * Stand fünfmal wortgleich im Code — in zwei lib-Dateien und drei Diagrammen.
 */
export function tagKurz(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}
