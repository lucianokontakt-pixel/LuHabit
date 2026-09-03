import { describe, expect, it } from "vitest";
import { CATALOG, fromCatalog } from "@/lib/exercise-catalog";
import { guete, normalisieren, suchwoerter, verlaufVon, woerter } from "@/lib/exercise-suche";
import { kernRang } from "@/lib/kern-uebungen";
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
        kernRang(b.e.id) - kernRang(a.e.id) ||
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
    name: "Langhantel-Bankdrücken",
    muscle: "chest",
    equipment: "barbell",
    en: "Barbell Bench Press",
    region: "chest-mid",
    primaerMuskeln: ["pectoralis_major"],
    tags: [],
    ...teil,
  });

  it("stuft vom Namensanfang bis zum bloßen Umfeld ab", () => {
    const e = uebung({});
    expect(guete(e, suchwoerter("langhantel bank"), "langhantel bank")).toBe(4);
    // „Bankdrücken" steht als eigenes Wort im Namen, aber nicht am Anfang.
    expect(guete(e, suchwoerter("bankdrücken"), "bankdrücken")).toBe(3);
    // „Brust" steht nur im Muskel-Etikett, nicht im Namen.
    expect(guete(e, suchwoerter("brust"), "brust")).toBe(1);
    expect(guete(e, suchwoerter("kniebeuge"), "kniebeuge")).toBe(0);
  });

  it("nimmt eine Endung mit, aber kein halbes Kompositum", () => {
    // „Curls" meint „Curl" …
    const curl = uebung({ name: "SZ-Stangen-Curl", en: "EZ-Bar Curl" });
    expect(guete(curl, suchwoerter("curls"), "curls")).toBeGreaterThan(0);
    // … „Frontheben" meint aber nicht jede „Front Squat".
    const squat = uebung({ name: "Front Squat", en: "Front Squat" });
    expect(guete(squat, suchwoerter("frontheben"), "frontheben")).toBe(0);
  });

  it("passt ohne Eingabe auf alles", () => {
    expect(guete(uebung({}), suchwoerter(""), "")).toBe(1);
  });
});

describe("die Suche auf der echten Bibliothek", () => {
  // Bis zum Wechsel auf RepDB hing hier ein Wörterbuch dazwischen, das die
  // Eingabe übersetzte — die Übungen hießen englisch. Seit die Bibliothek
  // selbst deutsch heißt, ist die Übersetzung ersatzlos entfallen; diese
  // Prüfungen zeigen, dass die deutschen Wörter trotzdem (und direkter)
  // treffen.
  it("findet die Grundübungen unter ihrem deutschen Namen", () => {
    expect(treffer("bankdrücken")).toContain("Langhantel-Bankdrücken");
    expect(treffer("bankdruecken")).toContain("Langhantel-Bankdrücken");
    expect(treffer("kniebeuge")).toContain("Langhantel-Kniebeuge");
    expect(treffer("kreuzheben")).toContain("Langhantel-Kreuzheben");
    expect(treffer("latzug")).toContain("Latzug");
    expect(treffer("beinpresse")).toContain("Beinpresse");
    expect(treffer("klimmzug")).toContain("Klimmzug");
    expect(treffer("seitheben")).toContain("Kurzhantel Seitheben");
  });

  it("findet dieselbe Übung auch über den englischen Namen", () => {
    expect(treffer("bench press")).toContain("Langhantel-Bankdrücken");
    expect(treffer("deadlift")).toContain("Langhantel-Kreuzheben");
  });

  it("kennt die Wortreihenfolge nicht als Bedingung", () => {
    expect(treffer("schrägbank langhantel")).toContain("Schrägbankdrücken mit Langhantel");
  });

  it("sucht auch über Muskel und Gerät", () => {
    expect(treffer("brust maschine")).toContain("Maschinen-Brustdrücken");
  });

  it("findet über den genauen Muskel aus dem Datensatz", () => {
    // „lats" steht in keinem Namen — nur in primaerMuskeln.
    expect(treffer("latissimus", 999)).toContain("Latzug");
  });
});

describe("die Ladeart als Suchwort", () => {
  it("trägt, was aus dem Gerät folgt", () => {
    // Die Multipresse nimmt Scheiben.
    expect(treffer("scheiben", 999)).toContain("Smith Machine Bankdrücken");
    // Der Kabelzug hat einen Block.
    expect(treffer("steckgewicht", 999)).toContain("Latzug");
    // Eine Übung ohne Gewicht darf über keine der beiden zu finden sein.
    expect(treffer("steckgewicht", 999)).not.toContain("Klimmzug");
    expect(treffer("scheiben", 999)).not.toContain("Klimmzug");
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
