/**
 * Die Schreibvorgänge, die offline warten können — als Daten beschrieben.
 *
 * Getrennt vom Speicher und vom Versand, weil hier das steckt, was still falsch
 * sein kann: was eine wartende Änderung im lokalen Bestand bewirkt, und in
 * welcher Reihenfolge mehrere Änderungen am selben Datensatz gelten. Das gehört
 * unter Tests, das Drumherum ist Mechanik.
 *
 * Zwei Regeln, an denen alles hängt:
 *
 *  1. Jede Operation ist wiederholbar. Sie beschreibt einen Zustand ("Wasser
 *     steht heute auf 750"), keine Veränderung ("+250"). Deshalb darf sie nach
 *     einem Abbruch mit unklarem Ausgang bedenkenlos erneut gesendet werden.
 *     Der Preis: zwei Geräte, die gleichzeitig offline dasselbe ändern,
 *     überschreiben einander — bei einem Nutzer mit einem Handy ist das der
 *     richtige Tausch.
 *
 *  2. Jede Operation trägt ihre ID selbst. Ein Plan, der offline entsteht,
 *     braucht sofort eine endgültige ID, sonst kann die App ihn bis zum
 *     Abgleich nirgends referenzieren.
 */

import type { WorkoutPlan, WorkoutSession } from "@/lib/training";
import type {
  Collection,
  StoredEntry,
  StoredExercise,
} from "@/lib/sync-payload";
import { entryKey } from "@/lib/sync-payload";

export type WriteOp =
  | { kind: "entry.set"; entry: StoredEntry }
  | { kind: "exercise.save"; exercise: StoredExercise; isNew: boolean }
  | { kind: "exercise.delete"; id: string }
  // daysChanged hält fest, ob die Tage wirklich neu geschrieben werden sollen.
  // Sonst würde jeder plan.save — auch ein bloßes Aktivieren — beim Senden die
  // Tage mitschicken; die Route ersetzt bei vorhandenem days-Feld ALLE Tage und
  // Übungen durch frische Zeilen mit neuen IDs. Das würde lastSession.dayId
  // (die "nächster Tag"-Rotation, siehe lib/training.ts nextDay) still ins
  // Leere laufen lassen, weil die alte dayId dann zu keinem Tag mehr passt.
  | { kind: "plan.save"; plan: WorkoutPlan; isNew: boolean; daysChanged: boolean }
  | { kind: "plan.delete"; id: string }
  | { kind: "session.save"; session: WorkoutSession; isNew: boolean }
  | { kind: "session.delete"; id: string };

/** Eine Operation mit ihrem Platz in der Schlange. */
export type QueuedOp = { seq: number; op: WriteOp; createdAt: string };

/**
 * Was eine Operation im lokalen Bestand bewirkt: in welcher Sammlung, unter
 * welchem Schlüssel, und ob sie schreibt oder entfernt.
 *
 * Genau diese Beschreibung erlaubt es, wartende Operationen nach einem Abgleich
 * erneut anzuwenden. Ohne das würde ein hereinkommender Abgleich eine noch
 * nicht gesendete Änderung überbügeln — die Anzeige spränge auf den alten Wert
 * zurück, und der Nutzer hielte seine Eingabe für verloren.
 */
export type LocalEffect =
  | { collection: Collection; key: string; action: "put"; data: unknown; sort: string }
  | { collection: Collection; key: string; action: "delete" };


/** Zahlen als Text sortieren nur richtig, wenn sie gleich lang sind. */
function pad(value: number): string {
  return String(Math.max(0, Math.round(value))).padStart(6, "0");
}

/**
 * Der Sortierschlüssel für einen lokal angelegten Datensatz. Er muss zu dem
 * passen, den der Abgleich vergibt (siehe lib/sync-payload.ts) — sonst
 * springt ein Eintrag beim nächsten Abgleich an eine andere Stelle der Liste.
 *
 * Für neu Angelegtes wird die aktuelle Zeit als Anlegedatum eingesetzt: der
 * Server wird genau das gleich eintragen.
 */
function nowStamp(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Was eine Operation im lokalen Bestand bewirkt — meist ein einzelner Effekt,
 * bei habit.save und habit.delete zwei: die Route schreibt bei jedem Anlegen,
 * Ändern und Löschen eines Habits IMMER auch die zugehörige goals-Zeile mit
 * (dasselbe Ziel liegt in einer eigenen Tabelle). Nur einen Effekt für die
 * Habit-Zeile zurückzugeben, hätte das Ziel bis zum nächsten Abgleich
 * unsichtbar gemacht — genau das ist beim Bauen aufgefallen: ein offline
 * angelegtes Habit zeigte kein Tagesziel, bis der nächste Abgleich es nachlieferte.
 */
export function localEffect(op: WriteOp): LocalEffect[] {
  switch (op.kind) {
    case "entry.set":
      return [
        {
          collection: "entries",
          key: entryKey(op.entry.habit, op.entry.date),
          action: "put",
          data: op.entry,
          sort: op.entry.date,
        },
      ];
    case "exercise.save":
      return [
        {
          collection: "exercises",
          key: op.exercise.id,
          action: "put",
          data: op.exercise,
          sort: op.exercise.name.toLowerCase(),
        },
      ];
    case "exercise.delete":
      return [{ collection: "exercises", key: op.id, action: "delete" }];
    case "plan.save":
      return [
        {
          collection: "plans",
          key: op.plan.id,
          action: "put",
          data: op.plan,
          sort: `${pad(op.plan.position)}|${nowStamp()}`,
        },
      ];
    case "plan.delete":
      return [{ collection: "plans", key: op.id, action: "delete" }];
    case "session.save":
      return [
        {
          collection: "sessions",
          key: op.session.id,
          action: "put",
          data: op.session,
          sort: `${op.session.date}|${nowStamp()}`,
        },
      ];
    case "session.delete":
      return [{ collection: "sessions", key: op.id, action: "delete" }];
  }
}

/**
 * Welchen Datensatz eine Operation betrifft — Sammlung und Schlüssel.
 * Zwei Operationen mit derselben Kennung heben einander auf: die spätere gilt.
 */
export function targetOf(op: WriteOp): string {
  // Der erste Effekt ist die Hauptsache — das entscheidet, welche zweier
  // Operationen auf denselben Datensatz beim Eindampfen gewinnt und ob eine
  // Einheit noch als "wartet auf Netz" gilt.
  const [effect] = localEffect(op);
  return `${effect.collection}:${effect.key}`;
}

/**
 * Die Schlange eindampfen: von mehreren Operationen auf denselben Datensatz
 * bleibt nur die letzte.
 *
 * Das ist kein Feinschliff, sondern nötig. Wer offline zehnmal auf "+250 ml"
 * tippt, erzeugt zehn Operationen auf denselben Eintrag; alle zehn zu senden
 * wäre neunmal umsonst. Weil jede Operation einen Zustand beschreibt und keine
 * Veränderung, ist die letzte ohnehin die einzige, die zählt.
 *
 * Die Reihenfolge der verbleibenden Operationen bleibt die ihres LETZTEN
 * Auftretens — so kommt eine Löschung, die nach einer Änderung kam, auch nach
 * ihr beim Server an.
 */
export function collapse(queued: QueuedOp[]): QueuedOp[] {
  const lastByTarget = new Map<string, QueuedOp>();
  for (const item of queued) {
    lastByTarget.set(targetOf(item.op), item);
  }
  return [...lastByTarget.values()].sort((a, b) => a.seq - b.seq);
}
