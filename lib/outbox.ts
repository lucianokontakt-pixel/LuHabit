/**
 * Einheiten, die ohne Netz abgeschlossen wurden.
 *
 * Im Gym reicht das Netz oft nicht bis in den Keller. Eine fertige Einheit darf
 * daran nicht scheitern: sie landet hier im localStorage und geht raus, sobald
 * die Verbindung zurück ist. Bis dahin wird sie im Trainings-Store wie eine
 * echte Einheit mitgeführt — sonst wäre das Training aus Sicht der App weg.
 */

import { addEntry } from "@/lib/api-client";
import { saveSession, type SessionInput } from "@/lib/api-training";
import type { WorkoutSession } from "@/lib/training";

const KEY = "luhabit-outbox";

export type PendingSession = {
  /** Ersatz für die Server-ID, bis die Einheit durch ist. */
  localId: string;
  payload: SessionInput;
  /** Minuten fürs Training-Habit, falls die Einheit eine echte Dauer hatte. */
  habitMinutes: number | null;
};

/**
 * Ein fehlgeschlagener fetch wirft einen TypeError — kein HTTP-Fehler, sondern
 * gar keine Antwort. navigator.onLine allein reicht nicht: iOS meldet WLAN als
 * online, auch wenn dahinter nichts hängt.
 */
export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return error instanceof TypeError;
}

const listeners = new Set<(pending: PendingSession[]) => void>();

export function readOutbox(): PendingSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(pending: PendingSession[]) {
  try {
    if (pending.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Speicher voll oder gesperrt — mehr als es zu versuchen geht hier nicht
  }
  for (const listener of listeners) listener(pending);
}

export function subscribeOutbox(listener: (pending: PendingSession[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function queueSession(
  payload: SessionInput,
  habitMinutes: number | null
): PendingSession {
  const entry: PendingSession = {
    localId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    habitMinutes,
  };
  writeOutbox([...readOutbox(), entry]);
  return entry;
}

/** Eine wartende Einheit verwerfen, bevor sie je beim Server ankommt. */
export function removePending(localId: string) {
  writeOutbox(readOutbox().filter((p) => p.localId !== localId));
}

/** Wie der Trainings-Store eine wartende Einheit sieht, solange sie wartet. */
export function pendingToSession(entry: PendingSession): WorkoutSession {
  const { payload } = entry;
  return {
    id: entry.localId,
    planId: payload.planId ?? null,
    dayId: payload.dayId ?? null,
    dayName: payload.dayName,
    date: payload.date ?? new Date().toLocaleDateString("sv-SE"),
    durationSeconds: payload.durationSeconds ?? null,
    note: payload.note ?? null,
    sets: payload.sets.map((s, i) => ({
      id: `${entry.localId}-${i}`,
      exerciseId: s.exerciseId,
      setIndex: s.setIndex,
      weight: s.weight,
      reps: s.reps,
      done: s.done ?? true,
      warmup: s.warmup ?? false,
    })),
  };
}

/**
 * Schickt die wartenden Einheiten der Reihe nach los und gibt zurück, wie viele
 * durchgingen. Beim ersten Netzfehler wird abgebrochen: die Reihenfolge bleibt
 * erhalten und ein Handy ohne Empfang klopft nicht die ganze Liste durch.
 * Ein echter Serverfehler (400/500) verwirft den Eintrag — er würde sonst bei
 * jedem Start erneut scheitern.
 */
export async function flushOutbox(): Promise<number> {
  let pending = readOutbox();
  if (pending.length === 0) return 0;

  let sent = 0;
  while (pending.length > 0) {
    const entry = pending[0];
    try {
      await saveSession(entry.payload);
      if (entry.habitMinutes !== null) {
        try {
          await addEntry({
            habit: "training",
            date: entry.payload.date ?? new Date().toLocaleDateString("sv-SE"),
            delta: entry.habitMinutes,
          });
        } catch {
          // Das Habit kann gelöscht worden sein — die Einheit ist trotzdem drin
        }
      }
      sent++;
    } catch (e) {
      if (isOfflineError(e)) break;
    }
    pending = pending.slice(1);
    writeOutbox(pending);
  }

  return sent;
}
