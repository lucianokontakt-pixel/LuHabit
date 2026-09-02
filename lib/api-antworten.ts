/**
 * Antworten, die jede Route gleich gibt.
 *
 * „Nicht angemeldet" stand achtmal wortgleich in den Routen und ein neuntes Mal
 * in der middleware. Das ist kein Schreibaufwand, sondern ein Risiko: ändert
 * jemand den Wortlaut an einer Stelle, prüft der Client danach auf zwei
 * verschiedene Texte — und merkt es erst, wenn eine Anmeldung nicht mehr
 * erkannt wird.
 */
export const UNAUTHORIZED = { error: "Nicht angemeldet" } as const;
