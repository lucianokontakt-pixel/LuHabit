// Prüft, dass jede SQL-Abfrage auf einer Datentabelle nach user_id filtert.
// Ein vergessener Filter würde fremde Daten zeigen, deshalb liegt der Test
// hier und nicht nur im Kopf. Aufruf: node scripts/audit-user-scope.mjs
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const TABLES = [
  "entries", "goals", "custom_habits", "exercises", "workout_plans",
  "plan_days", "plan_exercises", "workout_sessions", "workout_sets",
];

const files = globSync("app/api/**/route.ts");
const problems = [];
let checked = 0;

for (const file of files) {
  const src = readFileSync(file, "utf-8");
  for (const match of src.matchAll(/`([^`]*)`/gs)) {
    const sql = match[1];
    if (!/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql)) continue;
    if (!TABLES.some((t) => new RegExp(`\\b${t}\\b`).test(sql))) continue;
    checked++;
    if (!sql.includes("user_id")) {
      const line = src.slice(0, match.index).split("\n").length;
      problems.push(`${file}:${line}\n    ${sql.replace(/\s+/g, " ").trim().slice(0, 110)}`);
    }
  }
}

console.log(`${checked} Statements auf den Datentabellen geprüft`);
if (problems.length > 0) {
  console.error(`\n${problems.length} OHNE Nutzerfilter:`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log("alle tragen einen user_id-Filter");
