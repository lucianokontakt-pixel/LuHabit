/**
 * Baut die deutschen Anleitungen aus dem Wörterbuch.
 *
 *   node scripts/anleitungen-bauen.mjs
 *
 * Liest public/uebungen/anleitungen.json (englisch) und
 * scripts/anleitungen-woerterbuch.json (englischer Satz → deutscher Satz) und
 * schreibt public/uebungen/anleitungen-de.json.
 *
 * Geschrieben wird eine Übung nur, wenn JEDER ihrer Schritte übersetzt ist.
 * Alles andere wäre gefährlich: der Loader nimmt Deutsch, sobald es da ist, und
 * eine halb übersetzte Übung hätte stillschweigend Schritte verloren — man sähe
 * eine kürzere Anleitung und merkte nicht, dass etwas fehlt. Unvollständige
 * Übungen bleiben deshalb vorerst ganz englisch.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENGLISCH = "public/uebungen/anleitungen.json";
const WOERTERBUCH = "scripts/anleitungen-woerterbuch.json";
const ZIEL = "public/uebungen/anleitungen-de.json";

if (!existsSync(WOERTERBUCH)) {
  console.error(`${WOERTERBUCH} fehlt — erst übersetzen, dann bauen.`);
  process.exit(1);
}

const englisch = JSON.parse(readFileSync(ENGLISCH, "utf8"));
const woerterbuch = JSON.parse(readFileSync(WOERTERBUCH, "utf8"));

const deutsch = {};
let uebersetzt = 0;
let fehlend = 0;
const fehlendeSaetze = new Set();
let vollstaendig = 0;

for (const [id, schritte] of Object.entries(englisch)) {
  const zeilen = [];
  let alleDa = true;
  for (const satz of schritte) {
    const de = woerterbuch[satz];
    if (de) {
      zeilen.push(de);
      uebersetzt++;
    } else {
      alleDa = false;
      fehlend++;
      fehlendeSaetze.add(satz);
    }
  }
  if (alleDa && zeilen.length === schritte.length) {
    deutsch[id] = zeilen;
    vollstaendig++;
  }
}

writeFileSync(ZIEL, JSON.stringify(deutsch) + "\n");

const gesamtUebungen = Object.keys(englisch).length;
console.log(`${uebersetzt} von ${uebersetzt + fehlend} Schritten übersetzt`);
console.log(`${vollstaendig} von ${gesamtUebungen} Übungen vollständig auf Deutsch`);
console.log(`${fehlendeSaetze.size} verschiedene Sätze fehlen noch im Wörterbuch`);
console.log(`→ ${ZIEL} (${(JSON.stringify(deutsch).length / 1024).toFixed(0)} KB)`);

if (fehlendeSaetze.size > 0) {
  writeFileSync(
    "scripts/anleitungen-fehlend.json",
    JSON.stringify([...fehlendeSaetze], null, 2) + "\n"
  );
  console.log("   Was noch fehlt: scripts/anleitungen-fehlend.json");
}
