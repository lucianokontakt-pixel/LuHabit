import { readAll } from "@/lib/local-db";
import { entryKey } from "@/lib/sync-payload";
import { enqueue, flushQueue } from "@/lib/write-queue";
import { ensureLocalData } from "@/lib/sync";

/**
 * Körperwerte: was du an einem Tag gewogen hast, und wie viel davon Fett war.
 *
 * Sie liegen in der Tabelle `entries` mit der Spalte `habit` — ein Name aus der
 * Zeit, als die App auch Wasser und Schritte gezählt hat. Die Spalte heißt
 * weiter so, weil eine Umbenennung eine Migration wäre, die nichts besser
 * macht; nach außen heißt sie hier `metric`.
 */
export type Metric = "weight" | "bodyfat";

export type MetricEntry = { habit: string; date: string; value: number };

/**
 * Letzter bekannter Stand, im Speicher statt in IndexedDB. Ohne diesen
 * Zwischenspeicher würde jede neue Seite bei leer anfangen und beim Eintreffen
 * der echten Werte sichtbar „aufblitzen". Der IndexedDB-Abruf läuft trotzdem
 * weiter, damit der Stand aktuell bleibt.
 */
let cached: MetricEntry[] | null = null;

/**
 * Lässt Aufrufe mit demselben Schlüssel nacheinander statt gleichzeitig laufen.
 * Zwei schnelle Eingaben auf denselben Tag würden sonst beide denselben, noch
 * nicht aktualisierten Ausgangswert lesen.
 */
const chains = new Map<string, Promise<unknown>>();

function serialized<T>(key: string, run: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const next = previous.then(run, run);
  // Der Eintrag in der Map hält nur die Kette am Laufen, nicht die Werte —
  // Fehler dürfen die nächste Operation nicht blockieren.
  chains.set(
    key,
    next.catch(() => undefined)
  );
  return next;
}

export async function fetchMetric(params: {
  metric?: Metric;
  from?: string;
  to?: string;
}): Promise<MetricEntry[]> {
  await ensureLocalData();
  const all = await readAll<MetricEntry>("entries");
  cached = all;
  // Dieselben Filter, die vorher im SQL standen. Sortiert ist bereits nach
  // Datum aufsteigend, so wie es die Route lieferte.
  return all.filter(
    (e) =>
      (!params.metric || e.habit === params.metric) &&
      (!params.from || e.date >= params.from) &&
      (!params.to || e.date <= params.to)
  );
}

/**
 * Einen Wert für einen Tag setzen.
 *
 * Absoluter Wert, kein Zuwachs: die Warteschlange darf jede Operation
 * wiederholen, und zweimal „+0,5 kg" wären ein Kilo. Genau deshalb funktioniert
 * das Eintragen auch ohne Netz.
 */
export async function setMetric(params: {
  metric: Metric;
  date: string;
  value: number;
}): Promise<MetricEntry> {
  const key = entryKey(params.metric, params.date);
  return serialized(`entry:${key}`, async () => {
    const entry: MetricEntry = {
      habit: params.metric,
      date: params.date,
      value: params.value,
    };
    await enqueue({ kind: "entry.set", entry });
    void flushQueue();
    if (cached) {
      cached = [...cached.filter((e) => entryKey(e.habit, e.date) !== key), entry];
    }
    return entry;
  });
}

