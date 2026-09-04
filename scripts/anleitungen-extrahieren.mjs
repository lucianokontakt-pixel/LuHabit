/**
 * Zieht die einzigartigen Sätze aus den englischen Übungsanleitungen.
 *
 * 1295 Übungen ergeben 7538 Schritte, aber nur rund 4300 verschiedene Sätze —
 * "Repeat for the desired number of repetitions." allein steht 889-mal da.
 * Übersetzt wird deshalb der Satz, nicht die Übung.
 *
 *   node scripts/anleitungen-extrahieren.mjs
 *
 * Schreibt scripts/anleitungen-quelle.json: die Sätze nach Häufigkeit sortiert,
 * die häufigsten zuerst. So ist der erste Durchgang der wirkungsvollste, und
 * wer mittendrin aufhört, hat trotzdem den größten Teil abgedeckt.
 */

import { readFileSync, writeFileSync } from "node:fs";

const QUELLE = "public/uebungen/anleitungen.json";
const ZIEL = "scripts/anleitungen-quelle.json";

const anleitungen = JSON.parse(readFileSync(QUELLE, "utf8"));

const haeufigkeit = new Map();
for (const schritte of Object.values(anleitungen)) {
  for (const satz of schritte) {
    haeufigkeit.set(satz, (haeufigkeit.get(satz) ?? 0) + 1);
  }
}

const sortiert = [...haeufigkeit.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

writeFileSync(
  ZIEL,
  JSON.stringify(
    sortiert.map(([satz, anzahl]) => ({ satz, anzahl })),
    null,
    2
  ) + "\n"
);

const gesamt = [...haeufigkeit.values()].reduce((a, b) => a + b, 0);
console.log(`${Object.keys(anleitungen).length} Übungen, ${gesamt} Schritte`);
console.log(`${sortiert.length} einzigartige Sätze → ${ZIEL}`);
console.log(
  `Die 100 häufigsten decken ${(
    (sortiert.slice(0, 100).reduce((s, [, n]) => s + n, 0) / gesamt) *
    100
  ).toFixed(1)} % aller Vorkommen ab.`
);
