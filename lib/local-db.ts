/**
 * Der lokale Datenbestand auf dem Gerät.
 *
 * Bewusst eine dünne Hülle um IndexedDB: alles, was schiefgehen kann, steckt in
 * lib/sync-payload.ts und ist dort getestet. Hier passiert nur Ablegen, Holen
 * und Löschen — Code, den man ansieht statt ihn zu testen, weil IndexedDB im
 * Testlauf ohnehin nicht existiert.
 *
 * localStorage wäre zu klein und blockiert den Hauptthread; für 90 Übungen,
 * Hunderte Einträge und den ganzen Trainingsverlauf ist IndexedDB der richtige
 * Ort. Die Warteschlange liegt bewusst in einem eigenen Speicher, der beim
 * vollständigen Abgleich NICHT geleert wird — dort stehen Änderungen, die der
 * Server noch nicht kennt.
 */

import type { SyncSnapshot } from "@/lib/sync-payload";
import { entryKey } from "@/lib/sync-payload";
import type { LocalEffect, QueuedOp, WriteOp } from "@/lib/write-ops";

const DB_NAME = "luhabit";
// 2: "emomResults" als neue Sammlung dazugekommen.
// 3: Habits, Ziele und EMOM sind weggefallen — ihre Sammlungen ebenfalls.
const DB_VERSION = 4;

/**
 * Ab welcher Fassung der bestehende Bestand noch lesbar ist.
 *
 * Nur eine geänderte FORM der abgelegten Datensätze macht das Wegwerfen nötig
 * — eine bloß hinzugekommene Sammlung nicht: die alten Datensätze bleiben
 * gültig, die neue Sammlung startet ohnehin leer. Das ist kein Feinschliff.
 * Wer beim ersten Start nach einem Update kein Netz hat, säße sonst vor einer
 * leeren App, weil mit den Sammlungen auch der Cursor verschwindet und der
 * Abgleich, der alles zurückholen müsste, gerade nicht laufen kann.
 *
 * Also: nur anheben, wenn sich die Form der Datensätze wirklich ändert.
 */
const WIPE_BELOW_VERSION = 1;

/**
 * Was beim Öffnen einer vorhandenen Datenbank zu tun ist.
 *
 * Steht hier als eigene Funktion, weil das die eine Entscheidung im ganzen
 * Modul ist, die still Daten kosten kann — und weil IndexedDB im Testlauf
 * nicht existiert, das Drumherum sich also nicht prüfen lässt. Die
 * Entscheidung selbst schon.
 *
 * `oldVersion === 0` heißt: frisch angelegt, es gibt nichts zu retten und
 * nichts nachzuholen.
 */
export function upgradePlan(oldVersion: number): { wipe: boolean; dropCursor: boolean } {
  if (oldVersion <= 0) return { wipe: false, dropCursor: false };
  return { wipe: oldVersion < WIPE_BELOW_VERSION, dropCursor: true };
}

/** Die Sammlungen, die der Abgleich füllt. Werden bei einem vollständigen
 *  Abgleich geleert und neu geschrieben. */
export const DATA_STORES = ["entries", "exercises", "plans", "sessions"] as const;

/**
 * Sammlungen aus früheren Fassungen. Sie werden beim Öffnen entfernt, damit die
 * Datenbank nicht auf Dauer Speicher für etwas belegt, das niemand mehr liest.
 */
const RETIRED_STORES = ["goals", "habits", "emom", "emomResults"] as const;

export type DataStore = (typeof DATA_STORES)[number];

/** Cursor, Körperprofil und was sonst einzeln liegt. */
const META_STORE = "meta";
/** Änderungen, die noch zum Server müssen. Überlebt jeden Abgleich. */
const QUEUE_STORE = "queue";
/**
 * Änderungen, die der Server abgelehnt hat.
 *
 * Sie sind aus der Warteschlange raus — ein erneuter Versuch heilt eine
 * Ablehnung nicht und verstopfte nur alles dahinter. Weggeworfen werden dürfen
 * sie trotzdem nicht: der Zustand steht bereits lokal, die App sähe danach
 * synchron aus und wäre es nicht. Hier liegen sie, bis jemand entscheidet.
 */
const FAILED_STORE = "failed";

const CURSOR_KEY = "cursor";
const PROFILE_KEY = "bodyProfile";

export function localDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaktion abgebrochen"));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (!localDbAvailable()) {
    return Promise.reject(new Error("IndexedDB steht hier nicht zur Verfügung"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const plan = upgradePlan(event.oldVersion);

      // Hat sich die Form der abgelegten Datensätze geändert, sind die alten
      // nicht mehr lesbar — sie in neuer Fassung zu lesen endet in Abstürzen,
      // die aussehen wie Datenverlust. Dann werden die Sammlungen verworfen
      // und beim nächsten Abgleich vollständig neu geholt; der Server hat
      // alles, und die Warteschlange bleibt stehen. Kam bloß eine Sammlung
      // hinzu, bleibt der Bestand liegen — siehe WIPE_BELOW_VERSION.
      if (plan.wipe) {
        for (const name of [...DATA_STORES, META_STORE]) {
          if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
        }
      }
      // Jeder Datensatz liegt in einem Umschlag: { key, sort, data }. Der
      // Schlüssel ist habit|datum bzw. die ID, `sort` bildet die Reihenfolge
      // nach, die sonst das ORDER BY der Route liefern würde, und `data` ist
      // das unveränderte Objekt, das die App erwartet. Ohne den Umschlag
      // müssten Sortierfelder wie die Startzeit einer Einheit in den
      // Domänenobjekten mitgeschleppt werden, wo sie nicht hingehören.
      for (const name of DATA_STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);

      // Sammlungen, die es nicht mehr gibt, hier wegräumen. Ohne das bliebe
      // ihr Inhalt für immer im Speicher des Geräts liegen — unsichtbar, aber
      // belegt, und auf iOS zählt jedes Megabyte gegen die Quote.
      for (const name of RETIRED_STORES) {
        if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
      }

      // Bei jedem Upgrade den Cursor fallen lassen, damit der nächste Abgleich
      // einmal ALLES holt. Eine neu hinzugekommene Sammlung bekäme sonst nur
      // das mit, was sich seit dem letzten Abgleich geändert hat — was schon
      // vorher auf dem Server lag, fehlte in ihr dauerhaft. Die Daten selbst
      // bleiben liegen: ohne Netz zeigt die App weiter den vorhandenen Stand,
      // statt bis zum nächsten Empfang leer dazustehen.
      if (plan.dropCursor) {
        req.transaction?.objectStore(META_STORE).delete(CURSOR_KEY);
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "seq", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(FAILED_STORE)) {
        db.createObjectStore(FAILED_STORE, { keyPath: "seq" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("Lokale Datenbank ist von einem anderen Tab blockiert"));
  });

  // Ein Fehlschlag darf nicht dauerhaft hängen bleiben — beim nächsten Versuch
  // wird neu geöffnet.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

/** Der Schlüssel, unter dem ein Datensatz in seiner Sammlung liegt. */
function keyOf(store: DataStore, record: Record<string, unknown>): string {
  if (store === "entries") return entryKey(String(record.habit), String(record.date));
  return String(record.id);
}

/**
 * Das Ergebnis eines Abgleichs übernehmen — in EINER Transaktion über alle
 * Sammlungen. Bricht etwas ab, ist nichts geschrieben: ein halb übernommener
 * Abgleich mit fortgeschriebenem Cursor wäre der schlimmste Zustand, weil die
 * fehlenden Datensätze nie wieder angefragt würden.
 */
export async function applySnapshot(snapshot: SyncSnapshot): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([...DATA_STORES, META_STORE], "readwrite");

  const records: Record<DataStore, Record<string, unknown>[]> = {
    entries: snapshot.entries,
    exercises: snapshot.exercises,
    plans: snapshot.plans as unknown as Record<string, unknown>[],
    sessions: snapshot.sessions as unknown as Record<string, unknown>[],
  };

  for (const store of DATA_STORES) {
    const objectStore = tx.objectStore(store);

    // Ein vollständiger Abgleich ist die Wahrheit: was der Server nicht nennt,
    // gehört weg. Sonst blieben Zeilen liegen, die vor den Grabsteinen hart
    // gelöscht wurden und von denen niemand mehr erzählt.
    if (snapshot.full) objectStore.clear();

    const sortKeys = snapshot.sortKeys[store];
    for (const record of records[store]) {
      const key = keyOf(store, record);
      objectStore.put({ key, sort: sortKeys[key] ?? key, data: record });
    }
    for (const key of snapshot.removed[store]) {
      objectStore.delete(key);
    }
  }

  const meta = tx.objectStore(META_STORE);
  if (snapshot.bodyProfile) meta.put(snapshot.bodyProfile, PROFILE_KEY);
  // Der Cursor zuletzt und in derselben Transaktion: er darf nur gelten, wenn
  // auch die Daten angekommen sind.
  meta.put(snapshot.cursor, CURSOR_KEY);

  await done(tx);
}

type Envelope<T> = { key: string; sort: string; data: T };

/**
 * Alles aus einer Sammlung, in derselben Reihenfolge, die die Route liefern
 * würde. IndexedDB gibt von sich aus nach Schlüssel sortiert zurück — also
 * alphabetisch nach ID, was mit der fachlichen Ordnung nichts zu tun hat.
 * Deshalb wird hier nach dem gespeicherten Sortierschlüssel geordnet.
 */
export async function readAll<T>(store: DataStore, desc = false): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(store, "readonly");
  const rows = (await request(tx.objectStore(store).getAll())) as Envelope<T>[];
  // Ein Datensatz ohne Umschlag stammt aus einer älteren Fassung. Der
  // Versionssprung oben räumt so etwas eigentlich weg; falls doch einer
  // durchrutscht, soll er hinten einsortiert werden statt die ganze Liste
  // mitzureißen — eine unsortierte Liste ist besser als eine leere Seite.
  const sortOf = (row: Envelope<T>) => (typeof row?.sort === "string" ? row.sort : "￿");
  rows.sort((a, b) => (desc ? sortOf(b).localeCompare(sortOf(a)) : sortOf(a).localeCompare(sortOf(b))));
  return rows.filter((row) => row?.data !== undefined).map((row) => row.data);
}

/** Ein einzelner Datensatz, oder null. */
export async function readOne<T>(store: DataStore, key: string): Promise<T | null> {
  const db = await openDb();
  const tx = db.transaction(store, "readonly");
  const row = (await request(tx.objectStore(store).get(key))) as Envelope<T> | undefined;
  return row?.data ?? null;
}

export async function readCursor(): Promise<string | null> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, "readonly");
  const value = await request(tx.objectStore(META_STORE).get(CURSOR_KEY));
  return typeof value === "string" ? value : null;
}

export async function readBodyProfile<T>(): Promise<T | null> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, "readonly");
  const value = await request(tx.objectStore(META_STORE).get(PROFILE_KEY));
  return (value as T) ?? null;
}

/**
 * Alles Lokale wegwerfen — beim Abmelden. Die Warteschlange geht mit: sie
 * enthält Änderungen des abgemeldeten Kontos, die niemand anderes senden darf.
 */
export async function clearLocalDb(): Promise<void> {
  if (!localDbAvailable()) return;
  const db = await openDb();
  const tx = db.transaction([...DATA_STORES, META_STORE, QUEUE_STORE, FAILED_STORE], "readwrite");
  for (const store of [...DATA_STORES, META_STORE, QUEUE_STORE, FAILED_STORE]) {
    tx.objectStore(store).clear();
  }
  await done(tx);
}

/**
 * Eine einzelne Änderung im lokalen Bestand — das, was eine wartende Operation
 * bewirkt. Damit sieht die App ihre eigene Eingabe sofort, auch ohne Netz.
 */
export async function applyEffects(effects: LocalEffect[]): Promise<void> {
  if (effects.length === 0) return;
  const db = await openDb();
  // Eine Transaktion über alle beteiligten Sammlungen: habit.save schreibt
  // zum Beispiel Habit UND Ziel in einem Zug — halb angewendet wäre schlimmer
  // als gar nicht angewendet.
  const stores = [...new Set(effects.map((e) => e.collection))];
  const tx = db.transaction(stores, "readwrite");
  for (const effect of effects) {
    const store = tx.objectStore(effect.collection);
    if (effect.action === "delete") store.delete(effect.key);
    else store.put({ key: effect.key, sort: effect.sort, data: effect.data });
  }
  await done(tx);
}

/**
 * Eine Operation in die Warteschlange stellen. Die laufende Nummer vergibt
 * IndexedDB — sie bestimmt die Reihenfolge, in der gesendet wird.
 */
export async function queuePush(op: WriteOp): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const seq = await request(
    tx.objectStore(QUEUE_STORE).add({ op, createdAt: new Date().toISOString() })
  );
  await done(tx);
  return Number(seq);
}

/** Alles, was noch wartet, in der Reihenfolge des Einstellens. */
export async function queueAll(): Promise<QueuedOp[]> {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readonly");
  const rows = (await request(tx.objectStore(QUEUE_STORE).getAll())) as QueuedOp[];
  return rows.sort((a, b) => a.seq - b.seq);
}

/**
 * Eine abgelehnte Operation aufheben, mit dem Grund.
 *
 * Der Schlüssel ist die alte Warteschlangen-Nummer: sie ist eindeutig, und
 * damit landet dieselbe Ablehnung auch bei einem zweiten Versuch nicht doppelt.
 */
export async function failedPush(item: QueuedOp, reason: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(FAILED_STORE, "readwrite");
  tx.objectStore(FAILED_STORE).put({
    seq: item.seq,
    op: item.op,
    createdAt: item.createdAt,
    failedAt: new Date().toISOString(),
    reason,
  });
  await done(tx);
}

export type FailedOp = QueuedOp & { failedAt: string; reason: string };

/** Was der Server abgelehnt hat, älteste zuerst. */
export async function failedAll(): Promise<FailedOp[]> {
  const db = await openDb();
  const tx = db.transaction(FAILED_STORE, "readonly");
  const rows = (await request(tx.objectStore(FAILED_STORE).getAll())) as FailedOp[];
  return rows.sort((a, b) => a.seq - b.seq);
}

/** Abgelehntes endgültig verwerfen — oder wegräumen, wenn es doch durchging. */
export async function failedRemove(seqs: number[]): Promise<void> {
  if (seqs.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(FAILED_STORE, "readwrite");
  const store = tx.objectStore(FAILED_STORE);
  for (const seq of seqs) store.delete(seq);
  await done(tx);
}

/** Erledigte Operationen aus der Schlange nehmen. */
export async function queueRemove(seqs: number[]): Promise<void> {
  if (seqs.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const store = tx.objectStore(QUEUE_STORE);
  for (const seq of seqs) store.delete(seq);
  await done(tx);
}
