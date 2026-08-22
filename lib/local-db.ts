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

const DB_NAME = "luhabit";
const DB_VERSION = 1;

/** Die Sammlungen, die der Abgleich füllt. Werden bei einem vollständigen
 *  Abgleich geleert und neu geschrieben. */
export const DATA_STORES = [
  "entries",
  "goals",
  "habits",
  "exercises",
  "plans",
  "sessions",
  "emom",
] as const;

export type DataStore = (typeof DATA_STORES)[number];

/** Cursor, Körperprofil und was sonst einzeln liegt. */
const META_STORE = "meta";
/** Änderungen, die noch zum Server müssen. Überlebt jeden Abgleich. */
const QUEUE_STORE = "queue";

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
    req.onupgradeneeded = () => {
      const db = req.result;
      // Alle Sammlungen tragen ihren Schlüssel im Datensatz selbst — bei
      // Einträgen ist das habit|datum, sonst die ID.
      for (const name of DATA_STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "seq", autoIncrement: true });
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
  if (store === "goals") return String(record.habit);
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
    goals: snapshot.goals,
    habits: snapshot.habits,
    exercises: snapshot.exercises,
    plans: snapshot.plans as unknown as Record<string, unknown>[],
    sessions: snapshot.sessions as unknown as Record<string, unknown>[],
    emom: snapshot.emom as unknown as Record<string, unknown>[],
  };

  for (const store of DATA_STORES) {
    const objectStore = tx.objectStore(store);

    // Ein vollständiger Abgleich ist die Wahrheit: was der Server nicht nennt,
    // gehört weg. Sonst blieben Zeilen liegen, die vor den Grabsteinen hart
    // gelöscht wurden und von denen niemand mehr erzählt.
    if (snapshot.full) objectStore.clear();

    for (const record of records[store]) {
      objectStore.put({ ...record, key: keyOf(store, record) });
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

/** Alles aus einer Sammlung, ohne den internen Schlüssel. */
export async function readAll<T>(store: DataStore): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(store, "readonly");
  const rows = await request(tx.objectStore(store).getAll());
  return rows.map((row: Record<string, unknown>) => {
    // Der Schlüssel ist Buchhaltung dieses Speichers, kein Teil des Datensatzes.
    const rest = { ...row };
    delete rest.key;
    return rest as T;
  });
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
  const tx = db.transaction([...DATA_STORES, META_STORE, QUEUE_STORE], "readwrite");
  for (const store of [...DATA_STORES, META_STORE, QUEUE_STORE]) {
    tx.objectStore(store).clear();
  }
  await done(tx);
}
