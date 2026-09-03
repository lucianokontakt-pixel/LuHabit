// Erzeugt migrations/0024_repdb_katalog.sql aus lib/repdb-migration.ts.
//
//   node scripts/repdb-migration-bauen.mjs
//
// Von Hand geschrieben wäre die Datei 40 Zeilen Abschreibarbeit, bei der ein
// Tippfehler in einer ID stillschweigend Verlauf verlöre. Die Zuordnung steht
// in TypeScript, weil die Tests sie prüfen; das SQL fällt daraus.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALT_KATALOG = process.argv[2];
if (!ALT_KATALOG) {
  console.error("Aufruf: node scripts/repdb-migration-bauen.mjs <pfad/zum/alten/exercise-catalog.json>");
  process.exit(1);
}

const alt = JSON.parse(readFileSync(ALT_KATALOG, "utf8"));
const quelle = readFileSync(join(wurzel, "lib/repdb-migration.ts"), "utf8");
const paare = [...quelle.matchAll(/"(og-\d+)":\s*(?:"([a-z0-9-]+)"|null)/g)].map((m) => [
  m[1],
  m[2] ?? null,
]);

const q = (wert) => (wert === null || wert === undefined ? "NULL" : `'${String(wert).replace(/'/g, "''")}'`);
const z = (wert) => (wert === null || wert === undefined ? "NULL" : String(wert));

const zeilen = [];

zeilen.push(`-- Die Übungsbibliothek wechselt von openGym auf RepDB.
--
-- Die Übungs-IDs ändern sich damit vollständig ("og-0025" → "bench-press").
-- Pläne und Verlauf zeigen aber auf die alten — diese Migration zieht sie um.
--
-- Welche Übung welche wird, steht in lib/repdb-migration.ts; diese Datei ist
-- daraus erzeugt (scripts/repdb-migration-bauen.mjs) und wird nicht von Hand
-- bearbeitet. 32 der 40 benutzten Übungen haben ein Gegenstück, 8 nicht — die
-- bleiben als eigene Übung bestehen, mit Namen und Verlauf.
--
-- Anwenden mit:
--   npx wrangler d1 execute luhabit --remote --file=./migrations/0024_repdb_katalog.sql

-- Erst die 8 ohne Gegenstück retten. Eine Katalogübung, die nie verstellt
-- wurde, hat keine Zeile in exercises — nach dem Wechsel kennt der Katalog sie
-- nicht mehr, und ohne Zeile fiele sie ersatzlos aus Plan und Statistik. Also
-- eine Zeile anlegen, für jeden Nutzer, der sie benutzt (INSERT ... SELECT
-- DISTINCT über beide Quellen), und als eigene Übung markieren.`);

for (const [altId, neuId] of paare) {
  if (neuId !== null) continue;
  const e = alt.find((x) => x.id === altId);
  if (!e) throw new Error(`${altId} steht nicht im alten Katalog`);
  zeilen.push(`
INSERT OR IGNORE INTO exercises
  (user_id, id, name, muscle, equipment, is_custom, hidden, bodyweight_factor, load_factor, favorite)
SELECT nutzer, ${q(altId)}, ${q(e.name)}, ${q(e.muscle)}, ${q(e.equipment)}, 1, 0, ${z(e.startFactor)}, NULL, 0
FROM (
  SELECT DISTINCT user_id AS nutzer FROM plan_exercises WHERE exercise_id = ${q(altId)}
  UNION
  SELECT DISTINCT user_id AS nutzer FROM workout_sets WHERE exercise_id = ${q(altId)}
);
-- Wer die Übung schon einmal verstellt hatte, hat bereits eine Zeile; die
-- bekommt der INSERT oben nicht zu fassen. Sie ist ab jetzt trotzdem eine
-- eigene Übung — der Katalog kennt sie nicht mehr.
UPDATE exercises SET is_custom = 1, updated_at = datetime('now') WHERE id = ${q(altId)};`);
}

zeilen.push(`
-- Jetzt der Umzug. Die Reihenfolge ist egal, die Ziel-IDs sind neu und können
-- deshalb mit nichts kollidieren — anders als beim ersten Anlauf im August, wo
-- zwei alte Übungen dieselbe neue bekamen und SQLite über (user_id, id)
-- stolperte. Dass keine zwei aufs selbe Ziel zeigen, prüft ein Test.`);

for (const [altId, neuId] of paare) {
  if (neuId === null) continue;
  const e = alt.find((x) => x.id === altId);
  zeilen.push(`
-- ${e ? e.name : altId} → ${neuId}
UPDATE plan_exercises SET exercise_id = ${q(neuId)} WHERE exercise_id = ${q(altId)};
UPDATE workout_sets  SET exercise_id = ${q(neuId)} WHERE exercise_id = ${q(altId)};
UPDATE exercises     SET id = ${q(neuId)}, updated_at = datetime('now') WHERE id = ${q(altId)};`);
}

zeilen.push(`
-- Zum Schluss aufräumen. Übrig bleiben Zeilen mit alter ID, die weder in
-- einem Plan noch in einer Einheit vorkommen: Reste früherer Versuche, ohne
-- Favorit, Stufe oder eigene Ladeart. Ohne Katalogeintrag stünden sie ab jetzt
-- als eigene Übungen in der Bibliothek — Namen ohne Bild, die nie jemand
-- angelegt hat.
--
-- Die Bedingung prüft die Verwendung selbst, statt einer Liste zu vertrauen:
-- was benutzt wird, überlebt, auch wenn die Liste oben etwas übersehen hätte.
--
-- Als Grabstein, nicht als DELETE: die App ist local-first, jedes Gerät hält
-- eine eigene Kopie, und der Abgleich holt nur, was sich seit dem letzten Mal
-- geändert hat (app/api/sync/route.ts). Eine hart gelöschte Zeile ändert sich
-- nicht mehr — sie bliebe auf jedem Gerät stehen, das sie schon kennt.
UPDATE exercises
SET deleted_at = datetime('now'), updated_at = datetime('now')
WHERE id LIKE 'og-%'
  AND deleted_at IS NULL
  AND id NOT IN (SELECT exercise_id FROM plan_exercises)
  AND id NOT IN (SELECT exercise_id FROM workout_sets);`);

writeFileSync(join(wurzel, "migrations/0024_repdb_katalog.sql"), zeilen.join("\n") + "\n");
console.log(
  `migrations/0024_repdb_katalog.sql geschrieben — ` +
    `${paare.filter(([, n]) => n).length} Umzüge, ${paare.filter(([, n]) => !n).length} gerettet`
);
