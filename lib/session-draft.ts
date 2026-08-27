/**
 * Der Entwurf der laufenden Einheit.
 *
 * Er liegt in localStorage und nicht im lokalen Bestand: eine angefangene
 * Einheit gehört auf dieses eine Gerät und soll nirgendwo sonst auftauchen.
 * Erst das Abschließen macht daraus einen Datensatz, der abgeglichen wird.
 *
 * Schlüssel und Lesehilfe stehen hier, weil zwei Stellen sie brauchen: die
 * Einheit selbst und der Start-Knopf in der unteren Leiste, der wissen will,
 * ob gerade etwas läuft.
 */

export const DRAFT_KEY = "luhabit-active-session";

/**
 * Der Trainingstag, an dem gerade gearbeitet wird — oder null.
 *
 * Bewusst nur die ID und nicht der ganze Entwurf: der Aufrufer will wissen, ob
 * etwas offen ist, nicht was darin steht. Fehlender oder kaputter Speicher
 * heißt „nichts offen"; das ist der harmlose Ausgang.
 */
export function offenerEntwurfTag(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const dayId = (JSON.parse(raw) as { dayId?: unknown }).dayId;
    return typeof dayId === "string" && dayId ? dayId : null;
  } catch {
    return null;
  }
}

/**
 * Für useSyncExternalStore: Änderungen am Entwurf melden.
 *
 * Das storage-Ereignis feuert nur in ANDEREN Tabs — im eigenen bleibt es still.
 * Das reicht hier trotzdem: die Leiste hängt an usePathname und rendert beim
 * Seitenwechsel ohnehin neu, und dann liest useSyncExternalStore den Stand
 * frisch ein. Genau dort ändert sich auch etwas — eine Einheit beginnt oder
 * endet mit einem Seitenwechsel.
 */
export function abonniereEntwurf(melde: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", melde);
  return () => window.removeEventListener("storage", melde);
}

/** Auf dem Server gibt es keinen Entwurf — und beim ersten Rendern im Browser
 *  muss dasselbe herauskommen, sonst weicht die Hydration ab. */
export function keinEntwurf(): null {
  return null;
}
