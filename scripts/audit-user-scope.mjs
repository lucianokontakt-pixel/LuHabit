// Prüft zwei Dinge, die sich still rächen, wenn sie einmal vergessen werden:
//
//   1. Jede SQL-Abfrage auf einer Datentabelle filtert nach user_id.
//      Ein vergessener Filter würde fremde Daten zeigen.
//   2. Jedes SELECT auf einer weich gelöschten Tabelle filtert deleted_at.
//      Seit dem Sync-Umbau verschwinden gelöschte Zeilen nicht mehr, sondern
//      bekommen einen Grabstein — ein SELECT ohne diesen Filter zeigt also
//      Gelöschtes wieder an, und beim Abgleich kommt es aufs Handy zurück.
//
// Aufruf: node scripts/audit-user-scope.mjs
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const TABLES = [
  "entries", "goals", "custom_habits", "exercises", "workout_plans",
  "plan_days", "plan_exercises", "workout_sessions", "workout_sets",
  "body_profile", "emom_templates",
];

/**
 * Tabellen mit Grabstein-Spalte. Die Kindtabellen (plan_days, plan_exercises,
 * workout_sets) stehen bewusst nicht hier: sie haben keine eigenen Stempel,
 * sondern hängen an ihrem Elternteil, der als Ganzes gelesen und ersetzt wird.
 */
const SOFT_DELETED = [
  "entries", "goals", "custom_habits", "exercises",
  "workout_plans", "workout_sessions", "emom_templates",
];

const files = globSync("app/api/**/route.ts");
const missingUser = [];
const missingTombstone = [];
let checked = 0;

for (const file of files) {
  const src = readFileSync(file, "utf-8");
  for (const match of src.matchAll(/`([^`]*)`/gs)) {
    const sql = match[1];
    if (!/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql)) continue;
    if (!TABLES.some((t) => new RegExp(`\\b${t}\\b`).test(sql))) continue;
    checked++;

    const line = src.slice(0, match.index).split("\n").length;
    const excerpt = `${file}:${line}\n    ${sql.replace(/\s+/g, " ").trim().slice(0, 110)}`;

    if (!sql.includes("user_id")) missingUser.push(excerpt);

    // Nur lesende Zugriffe. Ein UPDATE, das den Grabstein selbst setzt, darf
    // ihn naturgemäß nicht ausfiltern.
    const reads = /\bSELECT\b/i.test(sql) && !/\b(INSERT|UPDATE|DELETE)\b/i.test(sql);
    const touchesSoftDeleted = SOFT_DELETED.some((t) => new RegExp(`\\bFROM\\s+${t}\\b`, "i").test(sql));
    if (reads && touchesSoftDeleted && !sql.includes("deleted_at")) {
      missingTombstone.push(excerpt);
    }
  }
}

console.log(`${checked} Statements auf den Datentabellen geprüft`);

let failed = false;
if (missingUser.length > 0) {
  console.error(`\n${missingUser.length} OHNE Nutzerfilter:`);
  for (const p of missingUser) console.error("  " + p);
  failed = true;
}
if (missingTombstone.length > 0) {
  console.error(`\n${missingTombstone.length} SELECT OHNE deleted_at-Filter:`);
  for (const p of missingTombstone) console.error("  " + p);
  failed = true;
}
if (failed) process.exit(1);

console.log("alle tragen einen user_id-Filter");
console.log("alle SELECTs auf weich gelöschten Tabellen filtern Grabsteine");
