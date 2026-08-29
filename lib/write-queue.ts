/**
 * Schreibvorgänge, die auf Netz warten können.
 *
 * Der Ablauf ist immer derselbe: die Änderung wandert sofort in den lokalen
 * Bestand (die App zeigt sie also unmittelbar) und zusätzlich in eine
 * Warteschlange. Was in der Schlange steht, geht raus, sobald Netz da ist.
 *
 * Die Reihenfolge ist streng: beim ersten Netzfehler wird abgebrochen, statt
 * die restliche Liste durchzuklopfen. Käme eine spätere Änderung vor einer
 * früheren an, wäre der Endzustand auf dem Server ein anderer als auf dem Gerät.
 *
 * Ein echter Serverfehler (400/404) verwirft die Operation. Sie würde sonst bei
 * jedem Start erneut scheitern und die Schlange für immer blockieren — und mit
 * ihr alles, was dahinter steht.
 */

import { applyEffects, queueAll, queuePush, queueRemove } from "@/lib/local-db";
import { collapse, localEffect, targetOf, type WriteOp } from "@/lib/write-ops";
import { notifyLocalDataChanged, notifyFlushSucceeded } from "@/lib/local-events";

const listeners = new Set<(pendingTargets: Set<string>) => void>();

/**
 * Wer wissen will, ob GENAU EIN Datensatz noch auf das Senden wartet — etwa
 * "wartet diese eine Einheit noch auf Netz" für die Anzeige nach dem
 * Abschließen —, meldet sich hier an. Eine reine Zahl hätte dafür nicht
 * gereicht; targetOf liefert denselben Schlüssel wie beim Einreihen.
 */
export function subscribeQueue(listener: (pendingTargets: Set<string>) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function announce() {
  const pending = await queueAll().catch(() => []);
  const targets = new Set(pending.map((item) => targetOf(item.op)));
  for (const listener of listeners) listener(targets);
}

/**
 * Ein fehlgeschlagener fetch wirft einen TypeError — kein HTTP-Fehler, sondern
 * gar keine Antwort. navigator.onLine allein reicht nicht: iOS meldet WLAN als
 * online, auch wenn dahinter nichts hängt.
 */
export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return error instanceof TypeError;
}

/**
 * Eine Änderung vormerken: erst lokal anwenden, dann einreihen.
 *
 * Diese Reihenfolge ist Absicht. Scheitert das Einreihen, steht die Änderung
 * wenigstens auf dem Gerät; scheiterte umgekehrt das lokale Anwenden, stünde
 * eine Änderung in der Schlange, die der Nutzer nirgends sieht.
 */
export async function enqueue(op: WriteOp): Promise<void> {
  await applyEffects(localEffect(op));
  notifyLocalDataChanged();
  await queuePush(op);
  await announce();
}

/**
 * Die wartenden Änderungen erneut auf den lokalen Bestand legen.
 *
 * Nötig nach jedem Abgleich: der bringt den Stand des Servers, der die noch
 * nicht gesendeten Änderungen naturgemäß nicht kennt. Ohne dieses Nachlegen
 * spränge die Anzeige auf den alten Wert zurück, und der Nutzer hielte seine
 * Eingabe für verloren.
 */
export async function reapplyPending(): Promise<void> {
  const pending = await queueAll().catch(() => []);
  if (pending.length === 0) return;
  for (const item of collapse(pending)) {
    await applyEffects(localEffect(item.op));
  }
}

/** Die HTTP-Anfrage zu einer Operation. Hier und nirgends sonst. */
async function send(op: WriteOp): Promise<Response> {
  const post = (url: string, body: unknown, method = "POST") =>
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const remove = (url: string) => fetch(url, { method: "DELETE" });

  switch (op.kind) {
    case "entry.set":
      // Absoluter Wert, kein delta — nur so ist ein zweiter Versuch harmlos.
      return post("/api/entries", op.entry);
    case "exercise.save":
      return post("/api/training/exercises", op.exercise, op.isNew ? "POST" : "PUT");
    case "exercise.delete":
      return remove(`/api/training/exercises?id=${encodeURIComponent(op.id)}`);
    case "plan.save":
      return post(
        "/api/training/plans",
        planBody(op.plan, op.isNew || op.daysChanged),
        op.isNew ? "POST" : "PUT"
      );
    case "plan.delete":
      return remove(`/api/training/plans?id=${encodeURIComponent(op.id)}`);
    case "planExercise.swap":
      return post(
        "/api/training/plans",
        { dayId: op.dayId, planExerciseId: op.planExerciseId, exerciseId: op.exerciseId },
        "PATCH"
      );
    case "session.save":
      return post("/api/training/sessions", sessionBody(op.session), op.isNew ? "POST" : "PUT");
    case "session.delete":
      return remove(`/api/training/sessions?id=${encodeURIComponent(op.id)}`);
  }
}

/**
 * `includeDays` steuert, ob days im Body landet. Die Route ersetzt bei
 * vorhandenem days-Feld ALLE Tage und Übungen durch frische Zeilen mit neuen
 * IDs — das darf nur passieren, wenn die Tage sich wirklich geändert haben.
 * Sonst würde ein bloßes Aktivieren die "nächster Tag"-Rotation kaputt
 * machen, die sich auf die dayId einer vergangenen Einheit verlässt.
 */
function planBody(plan: import("@/lib/training").WorkoutPlan, includeDays: boolean) {
  return {
    id: plan.id,
    name: plan.name,
    isActive: plan.isActive,
    weeklyTarget: plan.weeklyTarget,
    ...(includeDays
      ? {
          days: plan.days.map((day) => ({
            name: day.name,
            weekday: day.weekday,
            exercises: day.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              sets: e.sets,
              repMin: e.repMin,
              repMax: e.repMax,
              restSeconds: e.restSeconds,
              increment: e.increment,
              startWeight: e.startWeight,
            })),
          })),
        }
      : {}),
  };
}

function sessionBody(session: import("@/lib/training").WorkoutSession) {
  return {
    id: session.id,
    planId: session.planId,
    dayId: session.dayId,
    dayName: session.dayName,
    date: session.date,
    durationSeconds: session.durationSeconds,
    note: session.note,
    sets: session.sets.map((s) => ({
      exerciseId: s.exerciseId,
      setIndex: s.setIndex,
      weight: s.weight,
      reps: s.reps,
      done: s.done,
      warmup: s.warmup,
    })),
  };
}

let running: Promise<number> | null = null;

/**
 * Die Schlange abarbeiten. Gibt zurück, wie viele Operationen durchgingen.
 *
 * Mehrere gleichzeitige Aufrufe teilen sich einen Durchlauf — sonst könnten
 * zwei Durchläufe dieselbe Operation gleichzeitig senden.
 */
export function flushQueue(): Promise<number> {
  if (!running) {
    running = runFlush().finally(() => {
      running = null;
    });
  }
  return running;
}

async function runFlush(): Promise<number> {
  const pending = await queueAll().catch(() => []);
  if (pending.length === 0) return 0;

  // Von mehreren Änderungen am selben Datensatz zählt nur die letzte. Die
  // überholten werden mitentfernt, sobald die letzte durch ist.
  const toSend = collapse(pending);
  const superseded = pending
    .filter((item) => !toSend.some((keep) => keep.seq === item.seq))
    .map((item) => item.seq);

  const doneSeqs: number[] = [];
  for (const item of toSend) {
    try {
      const res = await send(item.op);
      if (res.ok || res.status === 404) {
        // 404 heißt: der Datensatz ist serverseitig schon weg. Für eine
        // Löschung ist das der gewünschte Zustand, für alles andere ein Fall,
        // den ein erneuter Versuch nicht heilt.
        doneSeqs.push(item.seq);
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        // Abgelehnt und bleibt abgelehnt — verwerfen, sonst blockiert diese
        // Operation die ganze Schlange dahinter für immer.
        doneSeqs.push(item.seq);
        continue;
      }
      // 5xx: der Server hat gerade ein Problem. Später erneut versuchen.
      break;
    } catch (e) {
      if (isOfflineError(e)) break;
      // Etwas anderes ist schiefgegangen — nicht das Netz. Auch das darf die
      // Schlange nicht dauerhaft verstopfen.
      doneSeqs.push(item.seq);
    }
  }

  if (doneSeqs.length > 0) {
    await queueRemove([...doneSeqs, ...superseded]);
    await announce();
    // Der Abgleich soll den echten Serverstand jetzt holen, nicht erst beim
    // nächsten Sichtbarkeits- oder Online-Ereignis — sonst zeigt das Gerät bis
    // dahin nur die eigene, grob geschätzte Fassung der gerade gesendeten
    // Zeilen (z.B. ohne den exakten Zeitstempel, den erst der Server vergibt).
    notifyFlushSucceeded();
  }
  return doneSeqs.length;
}
