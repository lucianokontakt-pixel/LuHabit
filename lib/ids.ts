/**
 * IDs, die Handy und Server gleichermaßen erzeugen dürfen.
 *
 * Für local-first muss ein neuer Plan, eine neue Einheit oder eine neue Vorlage
 * schon offline eine endgültige ID haben — sonst könnte die App sie bis zum
 * nächsten Abgleich nirgends referenzieren, und der Server müsste beim
 * Nachtragen IDs umschreiben. Deshalb erzeugt das Handy die ID und schickt sie
 * mit; der Server nimmt sie an, wenn sie sauber aussieht.
 *
 * Sicherheit steckt nicht in dieser Prüfung, sondern in der Datenbank: die
 * Upserts auf workout_plans und workout_sessions vergleichen den Besitzer
 * (siehe die Kommentare dort), weil dort die ID allein der Schlüssel ist. Hier
 * geht es nur darum, keinen Müll in den Schlüsselspalten zu sammeln.
 */

/** Kurz, sortierbar, kollisionsarm. Läuft im Browser wie im Worker. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Obergrenze, damit niemand Schlüsselspalten mit Romanen füllt. */
const MAX_LENGTH = 64;

/**
 * Prüft eine vom Client gelieferte ID gegen ihr Präfix. Gibt die ID zurück oder
 * null, wenn sie nicht taugt — der Aufrufer antwortet dann mit 400 statt
 * stillschweigend eine andere zu vergeben. Eine stille Ersetzung wäre die
 * schlechtere Wahl: das Handy hätte die Zeile dann unter einer ID abgelegt, die
 * es auf dem Server nie gab.
 */
export function validClientId(prefix: string, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (id.length > MAX_LENGTH) return null;
  if (!id.startsWith(`${prefix}-`)) return null;
  // Nach dem Präfix muss etwas stehen, und zwar nur Unverfängliches.
  const rest = id.slice(prefix.length + 1);
  if (rest.length === 0) return null;
  if (!/^[a-z0-9-]+$/.test(rest)) return null;
  return id;
}

/**
 * Die ID für einen neuen Datensatz: entweder die mitgeschickte des Handys oder
 * eine frische. `undefined` heißt "kümmere du dich drum", ein gesetzter, aber
 * ungültiger Wert ist ein Fehler und liefert null.
 */
export function resolveNewId(prefix: string, value: unknown): string | null {
  if (value === undefined || value === null) return newId(prefix);
  return validClientId(prefix, value);
}
