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
  return entwurfStand(entwurfRoh())?.dayId ?? null;
}

/**
 * Der rohe Text aus dem Speicher.
 *
 * Für useSyncExternalStore muss der Schnappschuss zwischen zwei Renderdurchläufen
 * derselbe Wert sein, solange sich nichts geändert hat. Ein frisch geparstes
 * Objekt wäre jedes Mal ein neues und triebe React in eine Endlosschleife — eine
 * Zeichenkette wird dagegen dem Wert nach verglichen. Das Auswerten passiert
 * deshalb erst danach, in entwurfStand.
 */
export function entwurfRoh(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

/** Auf dem Server gibt es keinen Speicher — siehe keinEntwurf. */
export function keinEntwurfRoh(): null {
  return null;
}

/**
 * Die Übungen einer Einheit: die des Plans, dann alles spontan Dazugekommene.
 *
 * `ersatz` trägt beide Abweichungen vom Plan, die eine laufende Einheit kennt:
 * ein Eintrag mit `null` heißt „heute ausgelassen", ein Eintrag mit einer Übung
 * heißt „dagegen getauscht". Beides gilt nur für diese Einheit — der Plan
 * bleibt unberührt.
 *
 * Der Ersatz steht an der Stelle der ausgetauschten Übung und nicht am Ende:
 * wer die Bank gegen Kurzhanteldrücken tauscht, will sie als erste Übung
 * behalten, nicht hinter den Seitheben wiederfinden.
 */
export function uebungenDerEinheit<T extends { id: string }>(
  geplant: readonly T[],
  ersatz: Readonly<Record<string, T | null>>,
  extras: readonly T[]
): T[] {
  const ausPlan = geplant.flatMap((pe) => {
    if (!(pe.id in ersatz)) return [pe];
    const dafuer = ersatz[pe.id];
    return dafuer ? [dafuer] : [];
  });
  return [...ausPlan, ...extras];
}

export type EntwurfStand = {
  dayId: string;
  /** Abgehakte Arbeitssätze. */
  erledigt: number;
  /** Arbeitssätze insgesamt — Aufwärmsätze zählen wie in der Einheit nicht mit. */
  gesamt: number;
};

/**
 * Was im Entwurf steht, so weit es außerhalb der Einheit jemanden angeht:
 * welcher Tag, und wie weit er ist.
 */
export function entwurfStand(raw: string | null): EntwurfStand | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as {
      dayId?: unknown;
      sets?: Record<string, { done?: unknown; warmup?: unknown }[]>;
    };
    if (typeof draft.dayId !== "string" || !draft.dayId) return null;

    let erledigt = 0;
    let gesamt = 0;
    for (const liste of Object.values(draft.sets ?? {})) {
      for (const satz of liste ?? []) {
        if (satz?.warmup) continue;
        gesamt += 1;
        if (satz?.done) erledigt += 1;
      }
    }
    return { dayId: draft.dayId, erledigt, gesamt };
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
