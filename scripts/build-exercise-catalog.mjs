// Erzeugt LuHabits Übungskatalog aus openGyms Datensatz.
//
//   node scripts/build-exercise-catalog.mjs [pfad/zu/openGym-main]
//
// Schreibt:
//   lib/exercise-catalog.json      — die Liste, wird mit der App ausgeliefert
//   public/uebungen/anleitungen.json — Anleitungen, erst bei Bedarf geladen
//   public/uebungen/gif|img/       — die Medien (kopiert, nicht verlinkt)
//
// Der Katalog ist bewusst kein Datenbankinhalt: er ist für alle Nutzer gleich
// und ändert sich nur, wenn dieses Skript neu läuft. In der Datenbank steht
// darum nur noch, was jemand selbst angelegt oder abgewandelt hat.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EQUIPMENT, MUSCLE, SECONDARY } from "./exercise-mapping.mjs";
import { translateName } from "./exercise-names.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const openGym = path.resolve(
  process.argv[2] ?? path.join(repo, "..", "openGym-main")
);

const source = path.join(openGym, "frontend", "src", "lib", "exercises-data.js");
if (!fs.existsSync(source)) {
  console.error(`Datensatz nicht gefunden: ${source}`);
  console.error("Pfad zu openGym-main als Argument übergeben.");
  process.exit(1);
}

const raw = fs.readFileSync(source, "utf8");
const all = JSON.parse(raw.match(/\[\s*\{[\s\S]*\}\s*\]/)[0]);

// Cardio-Geräte kennen weder Sätze noch Gewicht — im Krafttagebuch wären sie
// nur Rauschen in der Volumenstatistik.
const db = all.filter((e) => e.bp !== "cardio");

const seenNames = new Map();
const catalog = [];
const instructions = {};
const unknown = { equipment: new Set(), muscle: new Set() };
let untranslated = 0;

for (const e of db) {
  const equipment = EQUIPMENT[e.eq];
  const muscle = MUSCLE[e.tg];
  if (!equipment) unknown.equipment.add(e.eq);
  if (!muscle) unknown.muscle.add(e.tg);

  const translation = translateName(e.n, equipment);
  if (!translation.translated) untranslated++;

  // Ein paar Übungen des Datensatzes unterscheiden sich nur in Nuancen, die
  // beim Übersetzen verloren gehen. Statt sie zu verschlucken, nummerieren wir.
  let name = translation.name;
  const seen = (seenNames.get(name) ?? 0) + 1;
  seenNames.set(name, seen);
  if (seen > 1) {
    name = name.endsWith(")")
      ? `${name.slice(0, -1)}, Variante ${seen})`
      : `${name} (Variante ${seen})`;
  }

  const secondary = [
    ...new Set(
      (e.sm ?? []).map((m) => SECONDARY[m]).filter((m) => m && m !== muscle)
    ),
  ];

  catalog.push({
    id: `og-${e.id}`,
    name,
    muscle,
    equipment,
    secondary,
    // Die Mediendateien heißen durchweg "<id>-<hash>.gif" bzw. ".jpg" — es
    // reicht, den Hash zu speichern.
    media: e.gif.slice(e.id.length + 1, -4),
    en: e.n.replace(/в°/g, "°"),
  });

  instructions[`og-${e.id}`] = e.st;
}

catalog.sort((a, b) => a.name.localeCompare(b.name, "de"));

const mediaDir = path.join(repo, "public", "uebungen");
fs.mkdirSync(path.join(mediaDir, "gif"), { recursive: true });
fs.mkdirSync(path.join(mediaDir, "img"), { recursive: true });

let copied = 0;
for (const entry of catalog) {
  const base = `${entry.id.slice(3)}-${entry.media}`;
  for (const [kind, ext] of [["gif", "gif"], ["img", "jpg"]]) {
    const from = path.join(openGym, "media", kind, `${base}.${ext}`);
    const to = path.join(mediaDir, kind, `${base}.${ext}`);
    if (!fs.existsSync(from)) {
      console.warn(`fehlt: ${from}`);
      continue;
    }
    if (!fs.existsSync(to)) {
      fs.copyFileSync(from, to);
      copied++;
    }
  }
}

fs.writeFileSync(
  path.join(repo, "lib", "exercise-catalog.json"),
  JSON.stringify(catalog) + "\n"
);
fs.writeFileSync(
  path.join(mediaDir, "anleitungen.json"),
  JSON.stringify(instructions) + "\n"
);

const kb = (p) => Math.round(fs.statSync(p).size / 1024);
console.log(`Übungen:      ${catalog.length} (${all.length - db.length} Cardio-Übungen ausgelassen)`);
console.log(`Namen:        ${catalog.length - untranslated} vollständig übersetzt, ${untranslated} mit englischem Rest`);
console.log(`Katalog:      ${kb(path.join(repo, "lib", "exercise-catalog.json"))} KB`);
console.log(`Anleitungen:  ${kb(path.join(mediaDir, "anleitungen.json"))} KB`);
console.log(`Medien:       ${copied} Dateien kopiert`);
if (unknown.equipment.size) console.log(`Unbekanntes Gerät:  ${[...unknown.equipment].join(", ")}`);
if (unknown.muscle.size) console.log(`Unbekannter Muskel: ${[...unknown.muscle].join(", ")}`);
