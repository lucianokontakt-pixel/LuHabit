import { SUCHBEGRIFFE } from "@/lib/exercise-suchbegriffe";
import {
  EQUIPMENT_LABELS,
  LADEART_LABELS,
  MUSCLE_LABELS,
  REGIONS,
  ladeartVon,
  type Exercise,
} from "@/lib/training";

/**
 * Die Übungssuche — eine Stelle für den Wähler und die Bibliothek.
 *
 * Vorher stand in beiden dieselbe Kette aus `name.includes(q) || en.includes(q)`.
 * Sie hatte drei Löcher, und jedes kostet im Training Zeit:
 *
 *   1. Die Bibliothek heißt englisch. „Beinpresse“ fand nichts.
 *   2. Ein Teilstring kennt keine Wortgrenzen und keine Reihenfolge:
 *      „press incline“ fand „Lever Incline Chest Press“ nicht.
 *   3. Es gab keine Rangfolge. Der Deckel von 60 Treffern schnitt alphabetisch
 *      ab — wer „press“ tippte, bekam zuerst „Assisted …“.
 *
 * Was die Löcher stopft: eine gemeinsame Schreibweise (normalisieren), ein
 * Heuhaufen, der mehr ist als der Name (indexVon), deutsche Suchbegriffe
 * (lib/exercise-suchbegriffe.ts) und eine Trefferklasse statt eines Ja/Nein
 * (guete).
 */

/**
 * Eine Schreibweise für alles, was verglichen wird.
 *
 * Klein, ohne Umlaute und ohne Satzzeichen. Umlaute fallen dabei zweimal:
 * einmal als Zeichen (ü → u) und einmal als Umschreibung (ue → u). Das ist
 * Absicht — nur so sind „drücken“, „druecken“ und „drucken“ dasselbe Wort, und
 * niemand soll im Gym raten müssen, welche der drei Formen die App will.
 *
 * Der Preis ist klein und symmetrisch: aus „toe“ wird „to“, aber auf beiden
 * Seiten gleich, und damit findet es sich weiterhin selbst.
 */
export function normalisieren(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ae|oe|ue/g, (m) => m[0])
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Der normalisierte Text als einzelne Wörter. */
export function woerter(text: string): string[] {
  const norm = normalisieren(text);
  return norm === "" ? [] : norm.split(" ");
}

/**
 * Ein Wort der Eingabe mit allem, was es bedeuten kann.
 *
 * Jede Variante ist eine Liste von Wörtern, die vollständig treffen muss;
 * treffen tut das Wort, wenn irgendeine Variante trifft. Der Umweg über
 * Varianten statt einer geraden Übersetzung ist der Punkt: „Maschine“ steht
 * schon als Geräte-Etikett im Heuhaufen und soll dort weiter treffen, auch
 * wenn das Wörterbuch daraus zusätzlich „lever“ macht.
 */
type Suchwort = { varianten: string[][] };

/** Lange Schlüssel zuerst, damit „beinpresse“ nicht an „bein“ hängenbleibt. */
const SCHLUESSEL = Object.keys(SUCHBEGRIFFE).sort((a, b) => b.length - a.length);

function uebersetzung(wort: string): string[] | null {
  const treffer = SCHLUESSEL.find((k) => wort.startsWith(k));
  return treffer ? woerter(SUCHBEGRIFFE[treffer]) : null;
}

/** Die Eingabe, zerlegt und übersetzt. Leer heißt: es wurde nichts gesucht. */
export function suchwoerter(eingabe: string): Suchwort[] {
  return woerter(eingabe).map((wort) => {
    const uebersetzt = uebersetzung(wort);
    return { varianten: uebersetzt ? [[wort], uebersetzt] : [[wort]] };
  });
}

/**
 * Woran eine Übung erkannt wird. Der Name ist nur der Anfang: die deutschen
 * Etiketten für Muskel, Gerät, Bereich und Ladeart gibt es ohnehin schon, und
 * sie machen „brust maschine“ zu einer Suche, die ohne jedes Wörterbuch
 * funktioniert.
 */
type Index = { alle: string[]; name: string[]; nameNorm: string };

// Am Objekt statt an der ID: die Liste kommt aus dem Store und bleibt zwischen
// zwei Tastendrücken dieselbe. Wird sie neu geladen, fällt der alte Eintrag
// mit dem alten Objekt weg, statt einen veralteten Namen zu behalten.
const zwischenspeicher = new WeakMap<Exercise, Index>();

/** Das Wort für die Ladeart — leer, solange sie offen ist. */
function ladeartWort(exercise: Exercise): string {
  const art = ladeartVon(exercise);
  return art === null ? "" : LADEART_LABELS[art];
}

function indexVon(exercise: Exercise): Index {
  const bekannt = zwischenspeicher.get(exercise);
  if (bekannt) return bekannt;

  const nameNorm = normalisieren(exercise.name);
  const name = nameNorm === "" ? [] : nameNorm.split(" ");
  const region = REGIONS.find((r) => r.key === exercise.region);
  const index: Index = {
    nameNorm,
    name,
    alle: [
      ...new Set([
        ...name,
        ...woerter(exercise.en ?? ""),
        ...woerter(MUSCLE_LABELS[exercise.muscle] ?? ""),
        ...woerter(EQUIPMENT_LABELS[exercise.equipment] ?? ""),
        ...woerter(region?.label ?? ""),
        ...woerter(ladeartWort(exercise)),
      ]),
    ],
  };
  zwischenspeicher.set(exercise, index);
  return index;
}

/** Höchstens so viel darf ein Suchwort über das Wort im Heuhaufen hinausragen. */
const ENDUNG = 2;

/**
 * Trifft ein Wort der Suche eines im Heuhaufen?
 *
 * Wortanfang statt Teilstring — sonst fände „res“ jede zweite Übung.
 *
 * Die andere Richtung gilt auch, aber nur um eine Endung: wer „curls“ tippt,
 * meint „Curl“. Weiter darf sie nicht reichen, sonst zerfällt jedes deutsche
 * Kompositum in seinen Anfang — „Frontheben“ fände jede „Front Squat“, weil
 * es mit „front“ beginnt.
 */
function trifft(wort: string, heuhaufen: string[]): boolean {
  return heuhaufen.some(
    (w) =>
      w.startsWith(wort) ||
      (w.length >= 4 && wort.startsWith(w) && wort.length - w.length <= ENDUNG)
  );
}

function trifftWort(suchwort: Suchwort, heuhaufen: string[]): boolean {
  return suchwort.varianten.some((v) => v.every((w) => trifft(w, heuhaufen)));
}

/**
 * Die Eingabe als zusammenhängende Wortfolge — einmal übersetzt, einmal roh.
 *
 * „Seitheben“ heißt übersetzt „lateral raise“, und dass diese zwei Wörter im
 * Namen *nebeneinander* stehen, unterscheidet „Cable Lateral Raise“ von
 * „Assisted Lying Leg Raise With Lateral Throw Down“. Beide enthalten beide
 * Wörter; nur eines davon ist Seitheben.
 */
function phrasen(gesucht: Suchwort[], eingabe: string): string[] {
  const roh = normalisieren(eingabe);
  const uebersetzt = gesucht
    .map((s) => s.varianten[s.varianten.length - 1].join(" "))
    .join(" ");
  return uebersetzt === roh ? [roh] : [uebersetzt, roh];
}

/**
 * Wie gut eine Übung zur Eingabe passt — 0 heißt: gar nicht.
 *
 *   4  der Name fängt mit der Eingabe an
 *   3  die Eingabe steht als Wortfolge im Namen
 *   2  jedes Wort der Eingabe steckt im Namen, verstreut
 *   1  getroffen, aber nur über Muskel, Gerät, Bereich oder das Wörterbuch
 *
 * Klassen und keine Punktesumme: die Rangfolge entsteht danach aus dem Verlauf
 * und den Favoriten, und die soll eine erfundene Nachkommastelle nicht
 * überstimmen können.
 */
export function guete(exercise: Exercise, gesucht: Suchwort[], eingabe = ""): number {
  if (gesucht.length === 0) return 1;
  const index = indexVon(exercise);
  if (!gesucht.every((s) => trifftWort(s, index.alle))) return 0;

  const gesuchte = phrasen(gesucht, eingabe).filter((p) => p !== "");
  if (gesuchte.some((p) => index.nameNorm.startsWith(p))) return 4;
  const name = ` ${index.nameNorm} `;
  if (gesuchte.some((p) => name.includes(` ${p} `))) return 3;
  if (gesucht.every((s) => trifftWort(s, index.name))) return 2;
  return 1;
}

/** Was der Verlauf über eine Übung sagt. */
export type VerlaufEintrag = {
  /** Datum der jüngsten Einheit mit dieser Übung. */
  zuletzt: string;
  /** In wie vielen Einheiten sie vorkam. */
  anzahl: number;
};

/**
 * Wann und wie oft jede Übung vorkam.
 *
 * Aus den Einheiten, nicht aus der Übung — die weiß nichts über den Verlauf.
 * `sessions` kommt absteigend nach Datum (siehe lib/training-store.tsx), der
 * erste Treffer ist also schon der jüngste.
 */
export function verlaufVon(
  sessions: { date: string; sets: { exerciseId: string }[] }[]
): Record<string, VerlaufEintrag> {
  const verlauf: Record<string, VerlaufEintrag> = {};
  for (const session of sessions) {
    for (const id of new Set(session.sets.map((s) => s.exerciseId))) {
      const bekannt = verlauf[id];
      if (bekannt) bekannt.anzahl += 1;
      else verlauf[id] = { zuletzt: session.date, anzahl: 1 };
    }
  }
  return verlauf;
}
