import { MAX_NOTE_LENGTH, MAX_ROUNDS, type EmomResult } from "@/lib/emom";
import { readAll } from "@/lib/local-db";
import { ensureLocalData } from "@/lib/sync";
import { enqueue, flushQueue } from "@/lib/write-queue";
import { newId } from "@/lib/ids";

export type EmomResultInput = {
  templateName: string;
  roundsPlanned: number;
  roundsCompleted: number;
  note?: string | null;
  date?: string;
};

export async function fetchEmomResults(): Promise<EmomResult[]> {
  await ensureLocalData();
  // Absteigend, wie es das ORDER BY date DESC, created_at DESC der Route tat.
  return readAll<EmomResult>("emomResults", true);
}

export async function saveEmomResult(params: EmomResultInput): Promise<EmomResult[]> {
  const existing = await readAll<EmomResult>("emomResults", true);

  const result: EmomResult = {
    id: newId("emomr"),
    templateName: params.templateName.trim().slice(0, 60) || "EMOM",
    date: params.date || new Date().toLocaleDateString("sv-SE"),
    roundsPlanned: Math.round(Math.min(MAX_ROUNDS, Math.max(0, params.roundsPlanned))),
    roundsCompleted: Math.round(Math.min(MAX_ROUNDS, Math.max(0, params.roundsCompleted))),
    note: params.note?.trim().slice(0, MAX_NOTE_LENGTH) || null,
  };
  await enqueue({ kind: "emomResult.save", result });
  void flushQueue();

  return [result, ...existing];
}

/**
 * Ein bereits protokolliertes Ergebnis korrigieren. Braucht keinen eigenen
 * Schreibvorgang: die Route legt Ergebnisse per Upsert auf die ID ab, ein
 * erneutes Senden derselben ID überschreibt sie also.
 *
 * Der Name der Vorlage bleibt, wie er war — er ist die Momentaufnahme des
 * Tages und nicht das, was hier korrigiert wird.
 */
export async function updateEmomResult(params: {
  id: string;
  roundsCompleted: number;
  note?: string | null;
  date?: string;
}): Promise<EmomResult[]> {
  const existing = await readAll<EmomResult>("emomResults", true);
  const before = existing.find((r) => r.id === params.id);
  if (!before) throw new Error("Ergebnis nicht gefunden");

  const result: EmomResult = {
    ...before,
    date: params.date || before.date,
    roundsCompleted: Math.round(
      Math.min(MAX_ROUNDS, Math.max(0, params.roundsCompleted))
    ),
    note: params.note?.trim().slice(0, MAX_NOTE_LENGTH) || null,
  };
  await enqueue({ kind: "emomResult.save", result });
  void flushQueue();

  // Neu sortieren: ein geändertes Datum verschiebt den Eintrag in der Liste.
  return existing
    .map((r) => (r.id === params.id ? result : r))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteEmomResult(id: string): Promise<EmomResult[]> {
  await enqueue({ kind: "emomResult.delete", id });
  void flushQueue();

  return (await readAll<EmomResult>("emomResults", true)).filter((r) => r.id !== id);
}
