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
  return {
    status: "ok",
    cursor: snapshot.cursor,
    full: snapshot.full,
    received: countRecords(snapshot),
  };
}
