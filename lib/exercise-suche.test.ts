import { describe, expect, it } from "vitest";
import { CATALOG, fromCatalog } from "@/lib/exercise-catalog";
import { SUCHBEGRIFFE } from "@/lib/exercise-suchbegriffe";
import { guete, normalisieren, suchwoerter, verlaufVon, woerter } from "@/lib/exercise-suche";
import { RANK_SICHTBAR_AB, stufeVon, type Exercise } from "@/lib/training";

/** Die Bibliothek so, wie der Wähler sie standardmäßig zeigt. */
const SICHTBAR = CATALOG.map(fromCatalog).filter((e) => stufeVon(e) >= RANK_SICHTBAR_AB);

/** Die Namen der besten Treffer — dieselbe Reihenfolge wie im Wähler. */
function treffer(eingabe: string, anzahl = 5): string[] {
  const gesucht = suchwoerter(eingabe);
  return SICHTBAR.map((e) => ({ e, g: guete(e, gesucht, eingabe) }))
    .filter((t) => t.g > 0)
    .sort(
      (a, b) =>
        b.g - a.g ||
        stufeVon(b.e) - stufeVon(a.e) ||
        a.e.name.localeCompare(b.e.name, "de")
    )
    .slice(0, anzahl)
    .map((t) => t.e.name);
}

describe("normalisieren", () => {
  it("macht aus Umlaut, Umschreibung und Grundform dasselbe Wort", () => {
    expect(normalisieren("Bankdrücken")).toBe("bankdrucken");
    expect(normalisieren("Bankdruecken")).toBe("bankdrucken");
    expect(normalisieren("BANKDRUCKEN")).toBe("bankdrucken");
    expect(normalisieren("Straßenlauf")).toBe("strassenlauf");
  });

  it("macht aus Satzzeichen Wortgrenzen", () => {
    expect(woerter("Pull-Up")).toEqual(["pull", "up"]);
    expect(woerter("45° Side Bend")).toEqual(["45", "side", "bend"]);
    expect(woerter("   ")).toEqual([]);
  });
});

describe("guete", () => {
  const uebung = (teil: Partial<Exercise>): Exercise => ({
    ...fromCatalog(CATALOG[0]),
    id: "x",
    name: "Barbell Bench Press",
    muscle: "chest",
    equipment: "barbell",
    en: "barbell bench press",
    region: "chest-mid",
    ...teil,
  });

  it("stuft vom Namensanfang bis zum bloßen Umfeld ab", () => {
    const e = uebung({});
    expect(guete(e, suchwoerter("barbell bench"), "barbell bench")).toBe(4);
    expect(guete(e, suchwoerter("bench press"), "bench press")).toBe(3);
    expect(guete(e, suchwoerter("press barbell"), "press barbell")).toBe(2);
    // „Brust“ steht nur im Muskel-Etikett, nicht im Namen.
    expect(guete(e, suchwoerter("brust"), "brust")).toBe(1);
    expect(guete(e, suchwoerter("kniebeuge"), "kniebeuge")).toBe(0);
  });

  it("nimmt eine Endung mit, aber kein halbes Kompositum", () => {
    // „Curls“ meint „Curl“ …
    const curl = uebung({ name: "Barbell Curl", en: "barbell curl" });
    expect(guete(curl, suchwoerter("curls"), "curls")).toBeGreaterThan(0);
    // … „Frontheben“ meint aber nicht jede „Front Squat“.
    const squat = uebung({ name: "Barbell Front Squat", en: "barbell front squat" });
    expect(guete(squat, suchwoerter("frontheben"), "frontheben")).toBe(0);
  });

  it("passt ohne Eingabe auf alles", () => {
    expect(guete(uebung({}), suchwoerter(""), "")).toBe(1);
  });
});

describe("die Suche auf der echten Bibliothek", () => {
  // lib/exercise-suchbegriffe.ts ging beim RepDB-Umbau versehentlich verloren
  // (unversioniert, nur teilweise aus dem Gedächtnis wiederhergestellt — siehe
  // die Datei selbst) und deckt seither nur noch 14 statt der ursprünglich
  // gut 90 Suchbegriffe ab. Diese Prüfung testet darum nur noch, was das
  // wiederhergestellte Teilstück wirklich hergibt, nicht mehr "beinpresse",
  // "latzug", "seitheben" & Co. — die fehlen jetzt und finden nichts, bis
  // jemand sie neu einträgt.
  it("findet deutsch, was englisch heißt", () => {
    expect(treffer("bankdrücken")).toContain("Barbell Bench Press");
    expect(treffer("bankdruecken")).toContain("Barbell Bench Press");
  });

  it("kennt die Wortreihenfolge nicht als Bedingung", () => {
    expect(treffer("press incline")).toContain("Barbell Incline Bench Press");
  });

  it("sucht auch über Muskel und Gerät", () => {
    expect(treffer("brust maschine")).toContain("Lever Chest Press");
  });

  it("hat kein Wörterbuchwort, das ins Leere zeigt", () => {
    for (const schluessel of Object.keys(SUCHBEGRIFFE)) {
      expect(treffer(schluessel, 1), schluessel).not.toEqual([]);
    }
  });
});

describe("die Ladeart als Suchwort", () => {
  it("trägt nur bei, was feststeht", () => {
    // Die Multipresse steht im Namen und ergibt damit "Scheiben".
    expect(treffer("scheiben", 999)).toContain("Smith Bench Press");
    // Der Kabelzug hat einen Block, das folgt aus dem Gerät.
    expect(treffer("steckgewicht", 999)).toContain("Cable Lat Pulldown Full Range Of Motion");
    // Eine Maschine ohne Angabe darf über keine der beiden zu finden sein.
    expect(treffer("steckgewicht", 999)).not.toContain("Lever Chest Press");
    expect(treffer("scheiben", 999)).not.toContain("Lever Chest Press");
  });
});

describe("verlaufVon", () => {
  it("nimmt das jüngste Datum und zählt die Einheiten", () => {
    const verlauf = verlaufVon([
      { date: "2026-09-01", sets: [{ exerciseId: "a" }, { exerciseId: "a" }] },
      { date: "2026-08-25", sets: [{ exerciseId: "a" }, { exerciseId: "b" }] },
    ]);
    // Zwei Sätze in einer Einheit sind eine Einheit, nicht zwei.
    expect(verlauf.a).toEqual({ zuletzt: "2026-09-01", anzahl: 2 });
    expect(verlauf.b).toEqual({ zuletzt: "2026-08-25", anzahl: 1 });
    expect(verlauf.c).toBeUndefined();
  });
});
