/**
 * Vergleicht, was der Abgleich liefert, mit dem, was die bestehenden Routen
 * liefern. Beides muss denselben Datenbestand ergeben — weicht etwas ab, würde
 * die App nach der Umstellung auf lokale Daten etwas anderes anzeigen als heute.
 *
 * Das ist die Regressionsprobe für den local-first-Umbau: solange die
 * bestehenden Routen noch da sind, lässt sich der neue Weg gegen den alten
 * halten. Beim Bauen hat dieser Vergleich sofort ein Habit gefunden, das im
 * Abgleich fehlte, weil seine Zeile keinen Zeitstempel hatte.
 *
 * Braucht einen laufenden Server (npm run build && npm start). Aufruf:
 *   node scripts/compare-sync.ts
 *   LUHABIT_URL=http://localhost:3000 node scripts/compare-sync.ts
 *
 * Läuft direkt in Node, weil diese Datei und lib/sync-payload.ts nur
 * Typ-Importe haben — die entfernt Node beim Ausführen ersatzlos.
 */

import { readSyncPayload } from "../lib/sync-payload.ts";

const BASE = process.env.LUHABIT_URL ?? "http://localhost:3100";

async function get(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${path} antwortete mit ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

type WithId = { id: string };
const byId = <T extends WithId>(list: T[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
const json = (value: unknown) => JSON.stringify(value);

const [sync, plans, sessions, exercises] = await Promise.all([
  get("/api/sync"),
  get("/api/training/plans"),
  get("/api/training/sessions?limit=500"),
  get("/api/training/exercises"),
]);

const snapshot = readSyncPayload(sync);

const cases: [string, unknown[], unknown[]][] = [
  ["Pläne", byId(snapshot.plans), byId(plans.plans as WithId[])],
  ["Einheiten", byId(snapshot.sessions), byId(sessions.sessions as WithId[])],
  ["Übungen", byId(snapshot.exercises), byId(exercises.exercises as WithId[])],
];

let failed = 0;
for (const [name, fromSync, fromApi] of cases) {
  if (json(fromSync) === json(fromApi)) {
    console.log(`OK          ${name}: ${fromSync.length} identisch`);
    continue;
  }

  failed++;
  console.error(`ABWEICHUNG  ${name} — aus dem Abgleich ${fromSync.length}, aus der Route ${fromApi.length}`);
  for (let i = 0; i < Math.max(fromSync.length, fromApi.length); i++) {
    if (json(fromSync[i]) === json(fromApi[i])) continue;
    console.error(`  erste Abweichung an Stelle ${i}:`);
    console.error(`    Abgleich: ${json(fromSync[i])?.slice(0, 300) ?? "(fehlt)"}`);
    console.error(`    Route:    ${json(fromApi[i])?.slice(0, 300) ?? "(fehlt)"}`);
    break;
  }
}

if (failed > 0) {
  console.error(`\n${failed} Abweichung(en) — der Abgleich zeigt nicht denselben Bestand wie die Routen.`);
  process.exit(1);
}
console.log("\nDer Abgleich liefert exakt denselben Bestand wie die bestehenden Routen.");
