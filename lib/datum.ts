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
