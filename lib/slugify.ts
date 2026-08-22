/**
 * Bezeichner aus einem Namen ableiten — für Habits und Übungen, die keine
 * Präfix-ID tragen, sondern eine ID aus ihrem Namen ("bankdruecken-lh").
 *
 * Eine einzige Stelle für Server und Client: der Client muss beim Anlegen
 * offline denselben Bezeichner erzeugen können wie der Server, sonst würde
 * ein Datensatz lokal unter einer anderen ID liegen als später auf dem
 * Server — und beim nächsten Abgleich als zweiter, doppelter Eintrag
 * erscheinen.
 *
 * Habits und Übungen hatten bisher je eine eigene, leicht unterschiedliche
 * Fassung (Übungen ersetzen Umlaute vor der Normalisierung, Habits nicht) —
 * das bleibt hier bewusst erhalten, um das Verhalten für bestehende
 * Datensätze nicht zu verändern.
 */
export function slugifyHabit(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "habit"
  );
}

export function slugifyExercise(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "uebung"
  );
}

/**
 * Einen freien Bezeichner finden: base, sonst base-2, base-3, … Dieselbe
 * Regel, die die Routen serverseitig anwenden — hier gegen die lokal
 * bekannten IDs, damit ein Anlegen ohne Netz denselben Bezeichner wählt wie
 * es der Server tun würde.
 */
export function dedupeSlug(base: string, existingIds: string[]): string {
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
