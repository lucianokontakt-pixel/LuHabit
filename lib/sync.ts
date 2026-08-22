/**
 * Der Abgleich, von der App aus gesehen: holen, auswerten, ablegen.
 *
 * Absichtlich klein. Das Auswerten liegt in lib/sync-payload.ts (getestet), das
 * Ablegen in lib/local-db.ts (dünn). Hier steht nur, wann was passiert.
 */

import { readCursor, applySnapshot, localDbAvailable } from "@/lib/local-db";
import { readSyncPayload } from "@/lib/sync-payload";

export type SyncResult =
  | { status: "ok"; cursor: string; full: boolean; received: number }
  | { status: "offline" }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/** Wie viele Datensätze der Abgleich gebracht hat — nur fürs Protokoll. */
function countRecords(snapshot: ReturnType<typeof readSyncPayload>): number {
  return (
    snapshot.entries.length +
    snapshot.goals.length +
    snapshot.habits.length +
    snapshot.exercises.length +
    snapshot.plans.length +
    snapshot.sessions.length +
    snapshot.emom.length +
    Object.values(snapshot.removed).reduce((sum, list) => sum + list.length, 0)
  );
}

/**
 * Einmal abgleichen. Ohne gespeicherten Cursor holt der erste Lauf den
 * vollständigen Bestand.
 *
 * Der Cursor wird nur zusammen mit den Daten geschrieben (eine Transaktion in
 * applySnapshot). Bricht irgendetwas ab, bleibt der alte Cursor stehen und der
 * nächste Lauf holt denselben Ausschnitt erneut — doppelt ist folgenlos, weil
 * jeder Datensatz unter seinem Schlüssel abgelegt wird.
 */
export async function syncOnce(): Promise<SyncResult> {
  if (!localDbAvailable()) return { status: "unavailable" };

  let cursor: string | null = null;
  try {
    cursor = await readCursor();
  } catch {
    // Kein lesbarer Cursor heißt: von vorn. Lieber einmal alles holen, als
    // auf einem kaputten Stand weiterzurechnen.
    cursor = null;
  }

  let response: Response;
  try {
    const query = cursor ? `?since=${encodeURIComponent(cursor)}` : "";
    response = await fetch(`/api/sync${query}`);
  } catch {
    return { status: "offline" };
  }

  if (response.status === 401) return { status: "unauthorized" };
  if (!response.ok) return { status: "offline" };

  const snapshot = readSyncPayload(await response.json());
  if (!snapshot.cursor) {
    // Ohne Cursor dürfen die Daten nicht übernommen werden — der nächste
    // Abgleich wüsste sonst nicht, wo er ansetzen soll.
    return { status: "offline" };
  }

  await applySnapshot(snapshot);
  notifyLocalDataChanged();
  return {
    status: "ok",
    cursor: snapshot.cursor,
    full: snapshot.full,
    received: countRecords(snapshot),
  };
}

const listeners = new Set<() => void>();

/** Wer aus dem lokalen Bestand liest, will es erfahren, wenn er sich ändert. */
export function subscribeLocalData(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyLocalDataChanged() {
  for (const listener of listeners) listener();
}

let pendingSoon: ReturnType<typeof setTimeout> | null = null;

/**
 * Nach einem Schreibvorgang den lokalen Bestand nachziehen.
 *
 * Kurz verzögert und zusammengefasst: wer einen Plan speichert, löst mehrere
 * Schreibvorgänge kurz hintereinander aus, und jeder einzeln würde einen
 * eigenen Abgleich anstoßen. Die Oberfläche wartet nicht darauf — sie zeigt
 * die Änderung ohnehin schon optimistisch an; hier geht es nur darum, dass der
 * lokale Bestand den echten Stand vom Server bekommt.
 */
export function syncSoon() {
  if (pendingSoon) clearTimeout(pendingSoon);
  pendingSoon = setTimeout(() => {
    pendingSoon = null;
    syncOnce().catch(() => {
      // Ohne Netz normal — der nächste Auslöser holt es nach.
    });
  }, 400);
}

let firstSync: Promise<unknown> | null = null;

/**
 * Vor dem ersten Lesen sicherstellen, dass überhaupt etwas lokal liegt.
 *
 * Nur beim allerersten Start relevant — danach ist ein Cursor da und gelesen
 * wird sofort aus dem lokalen Bestand, ohne auf das Netz zu warten. Genau das
 * ist der Punkt der ganzen Übung.
 *
 * Mehrere gleichzeitige Aufrufer teilen sich einen Abgleich: beim Start fragen
 * mehrere Hooks parallel, und ein vollständiger Abgleich je Hook wäre
 * verschwendete Übertragung.
 */
export async function ensureLocalData(): Promise<void> {
  if (!localDbAvailable()) return;

  let cursor: string | null = null;
  try {
    cursor = await readCursor();
  } catch {
    cursor = null;
  }
  if (cursor) return;

  if (!firstSync) {
    firstSync = syncOnce().finally(() => {
      firstSync = null;
    });
  }
  await firstSync;
}
