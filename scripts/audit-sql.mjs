// Prüft jedes SQL-Statement der API gegen das echte Schema.
//
// Warum es das braucht: TypeScript, ESLint und die Tests sehen kein SQL. Ein
// falscher Spaltenname oder ein ON CONFLICT, das zu keinem Schlüssel passt,
// fällt sonst erst in der Produktion auf — beim Schreiben, also genau dann,
// wenn Daten verloren gehen. Beim Sync-Umbau hat dieser Test auf Anhieb zwei
// solche Fehler gefunden.
//
// Vorgehen: Schema und Migrationen in eine Wegwerf-Datenbank spielen, dann
// jedes Statement mit EXPLAIN vorbereiten lassen. EXPLAIN führt nichts aus,
// prüft aber Syntax, Tabellen, Spalten und Schlüssel.
//
// Braucht das sqlite3-Kommando (auf macOS vorinstalliert).
// Aufruf: node scripts/audit-sql.mjs
import { readFileSync, globSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "luhabit-sql-"));
const db = join(dir, "schema.db");

/**
 * SQL über die Standardeingabe einspielen, nicht als Argument: nur so arbeitet
 * das sqlite3-Kommando nach einem Fehler weiter. Als Argument übergeben bricht
 * es beim ersten Problem ab — und ein paar erwartete Fehler gibt es hier (siehe
 * unten), nach denen der Rest trotzdem laufen muss.
 */
function applySchema(sql) {
  try {
    execFileSync("sqlite3", [db], { input: sql, stdio: ["pipe", "ignore", "ignore"] });
  } catch {
    // Erwartete Doppelungen beim Einspielen — die Prüfung unten deckt auf,
    // falls dabei doch etwas Wesentliches gefehlt hat.
  }
}

try {
  // schema.sql enthält den Stand nach den frühen Migrationen. Die danach noch
  // einmal einzuspielen, wirft "duplicate column"-Fehler — die sind hier
  // erwartet und werden geschluckt. Alles Spätere greift sauber.
  applySchema(readFileSync("schema.sql", "utf-8"));
  for (const file of globSync("migrations/*.sql").sort()) {
    applySchema(readFileSync(file, "utf-8"));
  }

  // Absicherung gegen ein stilles Scheitern des Aufbaus: ohne diese Prüfung
  // würde ein leeres Schema als "alle Statements ungültig" durchschlagen und
  // sähe aus wie ein Code-Fehler.
  const tables = execFileSync("sqlite3", [db], {
    input: "SELECT name FROM sqlite_master WHERE type='table';",
    encoding: "utf-8",
  });
  for (const required of ["entries", "goals", "users", "workout_sessions", "emom_templates"]) {
    if (!tables.split("\n").includes(required)) {
      console.error(`Schema-Aufbau fehlgeschlagen: Tabelle ${required} fehlt.`);
      process.exit(1);
    }
  }

  let checked = 0;
  let skipped = 0;
  const problems = [];

  for (const file of globSync("app/api/**/route.ts")) {
    const src = readFileSync(file, "utf-8");
    for (const match of src.matchAll(/`([^`]*)`/gs)) {
      const sql = match[1];
      if (!/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql)) continue;
      // Statements mit ${...} setzen ihre Platzhalterliste erst zur Laufzeit
      // zusammen und lassen sich so nicht vorbereiten.
      if (sql.includes("${")) {
        skipped++;
        continue;
      }
      checked++;
      try {
        execFileSync("sqlite3", [db, `EXPLAIN ${sql.replace(/\s+/g, " ")}`], {
          stdio: ["ignore", "ignore", "pipe"],
        });
      } catch (e) {
        const line = src.slice(0, match.index).split("\n").length;
        const reason = String(e.stderr).trim().split("\n")[0];
        problems.push(`${file}:${line}\n    ${reason}\n    ${sql.replace(/\s+/g, " ").trim().slice(0, 110)}`);
      }
    }
  }

  console.log(`${checked} SQL-Statements gegen das Schema geprüft (${skipped} mit Platzhaltern übersprungen)`);
  if (problems.length > 0) {
    console.error(`\n${problems.length} UNGÜLTIG:`);
    for (const p of problems) console.error("  " + p);
    process.exit(1);
  }
  console.log("alle passen zum Schema");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
