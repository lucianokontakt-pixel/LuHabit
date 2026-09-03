// Baut lib/exercise-catalog.json aus dem RepDB-Datensatz.
//
//   node scripts/build-repdb-katalog.mjs
//
// Quelle ist data/repdb/exercises.json, und die liegt im Repo — anders als
// beim Vorgänger, der einen Ordner neben dem Repo erwartete und damit auf
// keinem zweiten Rechner lief.
//
// Wichtig gegenüber dem alten Skript: hier wird JEDES Feld geschrieben, das
// der Katalog trägt. Das alte Skript kannte `ladeart` nicht, und ein erneuter
// Lauf hätte 145 von Hand eingetragene Werte stillschweigend gelöscht. Was
// dieses Skript nicht schreibt, gehört auch nicht in den Katalog.
//
// Die Bilder liegen bereits unter public/uebungen/repdb/ und werden hier nur
// geprüft, nicht kopiert: sie ändern sich nicht mit dem Katalog.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MUSKEL_GRUPPE,
  MUSKEL_REGION,
  brustRegion,
  geraetVon,
  ladeartVon,
  beliebtheit,
} from "./repdb-zuordnung.mjs";
import { startFaktor } from "./exercise-startgewicht.mjs";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUELLE = join(wurzel, "data/repdb/exercises.json");
const ZIEL = join(wurzel, "lib/exercise-catalog.json");
const ZIEL_TEXTE = join(wurzel, "public/uebungen/texte.json");
const BILDER = join(wurzel, "public/uebungen/repdb/flat");

const roh = JSON.parse(readFileSync(QUELLE, "utf8"));
const uebungen = roh.exercises;

/**
 * Dateiname und Bildarten einer Übung.
 *
 * Der Dateiname kommt aus dem Datensatz und wird NICHT aus der ID gebaut: ein
 * gutes Dutzend Übungen teilt sich das Bild mit einer Schwesterübung, der
 * "Langhantel-Ausfallschritt" zeigt `barbell-reverse-lunge-*`. Aus der ID
 * gebaut fehlten genau diese zwölf Bilder.
 */
function bilderVon(eintrag) {
  const flat = eintrag.images?.flat ?? {};
  const arten = flat.start && flat.peak ? ["start", "peak"] : flat.main ? ["main"] : [];
  if (arten.length === 0) return { basis: null, arten };
  const pfad = flat[arten[0]];
  const datei = pfad.slice(pfad.lastIndexOf("/") + 1);
  return { basis: datei.replace(new RegExp(`-${arten[0]}\\.webp$`), ""), arten };
}

const unbekannteMuskeln = new Set();
const fehlendeBilder = [];

/**
 * Beschreibung, Anleitung und Tipps stehen NICHT im Katalog, sondern in einer
 * eigenen Datei unter public/. Sie machen 436 der 810 KB aus und werden nur
 * gebraucht, wenn jemand eine einzelne Übung aufschlägt — im Katalog lägen sie
 * in jedem Seitenaufruf mit im Bündel. Dieselbe Trennung wie vorher bei
 * anleitungen.json, nur jetzt in einer Datei und auf Deutsch.
 */
const texte = {};

const katalog = uebungen.map((e) => {
  const primaer = e.primary_muscles ?? [];
  const muscle = MUSKEL_GRUPPE[primaer[0]];
  if (!muscle) unbekannteMuskeln.add(primaer[0]);

  const region =
    muscle === "chest" ? brustRegion(e.name_de) : (MUSKEL_REGION[primaer[0]] ?? null);

  const geraet = geraetVon(e.equipment, e.is_bodyweight);

  // Nebenmuskeln als Gruppen, ohne die eigene Gruppe: "Bankdrücken trifft auch
  // die Brust" ist keine Auskunft.
  const secondary = [
    ...new Set(
      (e.secondary_muscles ?? [])
        .map((m) => MUSKEL_GRUPPE[m])
        .filter((m) => m && m !== muscle)
    ),
  ];

  // Deutsch und Englisch nebeneinander: die Bibliothek lässt sich in den
  // Einstellungen auf englische Namen umstellen, und dann sollen Beschreibung,
  // Anleitung und Tipps mitziehen statt halb deutsch stehenzubleiben.
  // Spanisch liegt im Datensatz ebenfalls vor und bleibt bewusst draußen — die
  // App spricht es nirgends, und 450 KB ungenutzter Text kostet jede Seite.
  texte[e.id] = {
    de: {
      beschreibung: e.description_de,
      anleitung: e.instructions_de ?? [],
      tipps: e.tips_de ?? [],
    },
    en: {
      beschreibung: e.description_en,
      anleitung: e.instructions_en ?? [],
      tipps: e.tips_en ?? [],
    },
  };

  const { basis, arten } = bilderVon(e);
  for (const art of arten) {
    if (!existsSync(join(BILDER, `${basis}-${art}.webp`))) {
      fehlendeBilder.push(`${basis}-${art}.webp`);
    }
  }

  return {
    id: e.id,
    name: e.name_de,
    nameEn: e.name_en,
    muscle,
    equipment: geraet,
    secondary,
    region,
    rank: beliebtheit(e),
    startFactor: startFaktor({
      name: e.name_en,
      muscle,
      equipment: geraet,
      isolation: e.mechanic === "isolation",
      einseitig: e.is_unilateral,
    }),
    ladeart: ladeartVon({ equipment: e.equipment, geraet, istEigengewicht: e.is_bodyweight }),
    media: basis,
    bilder: arten,
    // Der genaue Gerätename aus dem Datensatz ("leg_press", "smith_machine").
    // `equipment` fasst 55 davon auf 9 zusammen, was für Filter und Plan
    // richtig ist — hier bleibt das Original, weil die Ladeart daran hängt und
    // weil es zu 55 Geräten ein Bild gibt (public/uebungen/repdb/geraete).
    geraetKuerzel: e.equipment ?? null,
    kategorie: e.category,
    mechanik: e.mechanic,
    zugArt: e.force_type,
    schwierigkeit: e.difficulty,
    primaerMuskeln: primaer,
    sekundaerMuskeln: e.secondary_muscles ?? [],
    variationsgruppe: e.variation_group ?? null,
    einseitig: e.is_unilateral,
    eigengewicht: e.is_bodyweight,
    met: e.met,
    ziele: e.goals ?? [],
    tags: e.tags ?? [],
  };
});

katalog.sort((a, b) => a.name.localeCompare(b.name, "de"));

writeFileSync(ZIEL, JSON.stringify(katalog));
writeFileSync(ZIEL_TEXTE, JSON.stringify(texte));

// --- Was dabei herauskam ------------------------------------------------

const zaehle = (fn) => {
  const m = {};
  for (const e of katalog) m[fn(e)] = (m[fn(e)] ?? 0) + 1;
  return m;
};

console.log(`${katalog.length} Übungen → lib/exercise-catalog.json`);
console.log(
  `  ${(JSON.stringify(katalog).length / 1024).toFixed(0)} KB Katalog` +
    ` + ${(JSON.stringify(texte).length / 1024).toFixed(0)} KB Texte (public/uebungen/texte.json)`
);
console.log("  Muskelgruppen:", JSON.stringify(zaehle((e) => e.muscle)));
console.log("  Geräte:       ", JSON.stringify(zaehle((e) => e.equipment)));
console.log("  Ladearten:    ", JSON.stringify(zaehle((e) => e.ladeart)));
console.log("  Stufen:       ", JSON.stringify(zaehle((e) => e.rank)));
console.log(
  `  mit Region:    ${katalog.filter((e) => e.region).length}` +
    ` | mit Variationsgruppe: ${katalog.filter((e) => e.variationsgruppe).length}` +
    ` | mit Anleitung: ${Object.values(texte).filter((t) => t.de.anleitung.length > 0).length}`
);

const doppelteNamen = Object.entries(zaehle((e) => e.name)).filter(([, n]) => n > 1);
if (doppelteNamen.length > 0) {
  console.warn(`  ⚠ ${doppelteNamen.length} doppelte Namen:`, doppelteNamen.slice(0, 5));
}
if (unbekannteMuskeln.size > 0) {
  console.warn("  ⚠ Muskeln ohne Zuordnung:", [...unbekannteMuskeln]);
}
if (fehlendeBilder.length > 0) {
  console.warn(`  ⚠ ${fehlendeBilder.length} Bilder fehlen:`, fehlendeBilder.slice(0, 5));
}
