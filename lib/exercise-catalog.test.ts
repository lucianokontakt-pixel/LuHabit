import { describe, expect, it } from "vitest";
import {
  CATALOG,
  catalogEntry,
  bildUrl,
  fromCatalog,
  mergeExercises,
  type ExerciseRecord,
} from "@/lib/exercise-catalog";
import { REPDB_MIGRATION } from "@/lib/repdb-migration";
import { KERN_UEBUNGEN_IDS } from "@/lib/kern-uebungen";
import { SPLIT_TEMPLATES } from "@/lib/exercise-seed";
import {
  EQUIPMENT,
  MUSCLES,
  RANK_SICHTBAR_AB,
  REGIONS,
  stufeVon,
  ladeartVon,
  type Muscle,
} from "@/lib/training";

const zeile = (teil: Partial<ExerciseRecord> & { id: string }): ExerciseRecord => ({
  name: "Zeile",
  muscle: "chest",
  equipment: "barbell",
  isCustom: false,
  hidden: false,
  favorite: false,
  increment: null,
  bodyweightFactor: null,
  loadFactor: null,
  warmup: null,
  rating: null,
  ladeart: null,
  ...teil,
});

describe("Katalog", () => {
  it("hat eindeutige IDs", () => {
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
  });

  it("kennt nur Muskeln und Geräte, die die App kennt", () => {
    const muskeln = new Set(MUSCLES.map((m) => m.key));
    const geraete = new Set(EQUIPMENT);
    for (const e of CATALOG) {
      expect(muskeln, e.name).toContain(e.muscle);
      expect(geraete, e.name).toContain(e.equipment);
      for (const s of e.secondary) expect(muskeln, e.name).toContain(s);
      // Der Nebenmuskel ist der *andere*: "Bankdrücken trifft auch die Brust"
      // wäre keine Auskunft.
      expect(e.secondary, e.name).not.toContain(e.muscle);
    }
  });

  it("heißt deutsch und kennt den englischen Zweitnamen", () => {
    for (const e of CATALOG) {
      expect(e.name.length, e.id).toBeGreaterThan(0);
      expect(e.nameEn.length, e.id).toBeGreaterThan(0);
    }
    // Stichprobe: die Bibliothek hieß bis zum Wechsel auf RepDB englisch.
    expect(catalogEntry("bench-press")?.name).toBe("Langhantel-Bankdrücken");
    expect(catalogEntry("squat")?.name).toBe("Langhantel-Kniebeuge");
  });

  it("hat zu jeder Übung ein Bild", () => {
    for (const e of CATALOG) {
      expect(e.bilder.length, e.name).toBeGreaterThan(0);
      expect(bildUrl(e, "start"), e.name).toMatch(/^\/uebungen\/repdb\/flat\/.+\.webp$/);
    }
  });

  it("zeigt beide Positionen, wo der Datensatz sie hat", () => {
    const paare = CATALOG.filter((e) => e.bilder.length === 2);
    // Zwei Drittel der Bibliothek haben Start und Umkehrpunkt — daran hängt
    // die Überblendung in der laufenden Einheit.
    expect(paare.length).toBeGreaterThan(CATALOG.length / 2);
    const eins = CATALOG.find((e) => e.bilder.length === 1)!;
    expect(eins.bilder).toEqual(["main"]);
  });
});

describe("Beliebtheit", () => {
  it("ist eine ganze Zahl von 1 bis 5", () => {
    for (const e of CATALOG) {
      expect(Number.isInteger(e.rank), e.name).toBe(true);
      expect(e.rank, e.name).toBeGreaterThanOrEqual(1);
      expect(e.rank, e.name).toBeLessThanOrEqual(5);
    }
  });

  it("hält Dehnen und Ausdauer aus der Trefferliste heraus", () => {
    for (const e of CATALOG) {
      if (e.kategorie === "stretching" || e.kategorie === "cardio") {
        expect(e.rank, e.name).toBeLessThan(RANK_SICHTBAR_AB);
      }
    }
  });

  it("lässt den weitaus größeren Teil sichtbar", () => {
    const versteckt = CATALOG.filter((e) => e.rank < RANK_SICHTBAR_AB);
    expect(versteckt.length).toBeLessThan(CATALOG.length / 4);
  });

  it("lässt in jeder Muskelgruppe etwas übrig", () => {
    for (const m of MUSCLES) {
      const sichtbar = CATALOG.filter((e) => e.muscle === m.key && e.rank >= RANK_SICHTBAR_AB);
      expect(sichtbar.length, m.label).toBeGreaterThan(0);
    }
  });

  it("achtet die selbst vergebene Stufe", () => {
    const e = fromCatalog(CATALOG[0]);
    expect(stufeVon({ ...e, rating: 1 })).toBe(1);
    expect(stufeVon(e)).toBe(e.rank);
  });
});

describe("Startgewicht", () => {
  it("ist null genau bei Eigengewicht", () => {
    for (const e of CATALOG) {
      if (e.equipment === "bodyweight") expect(e.startFactor, e.name).toBeNull();
      else expect(e.startFactor, e.name).not.toBeNull();
    }
  });

  it("bleibt in einem plausiblen Bereich", () => {
    for (const e of CATALOG) {
      if (e.startFactor === null) continue;
      expect(e.startFactor, e.name).toBeGreaterThan(0);
      expect(e.startFactor, e.name).toBeLessThanOrEqual(1.5);
    }
  });

  it("gibt der Isolationsübung weniger als der Grundübung", () => {
    const druecken = catalogEntry("db-bench-press")!;
    const fliegend = catalogEntry("db-fly")!;
    expect(druecken.startFactor!).toBeGreaterThan(fliegend.startFactor!);
  });
});

describe("Regionen", () => {
  it("gehört immer zur Muskelgruppe der Übung", () => {
    for (const e of CATALOG) {
      if (!e.region) continue;
      const region = REGIONS.find((r) => r.key === e.region);
      expect(region, `${e.name}: ${e.region}`).toBeDefined();
      expect(region!.muscle, e.name).toBe(e.muscle);
    }
  });

  it("steht bei jeder Brustübung — die kommt aus dem Namen", () => {
    for (const e of CATALOG.filter((e) => e.muscle === "chest")) {
      expect(e.region, e.name).not.toBeNull();
    }
  });

  it("bleibt bei den Gruppen leer, die keine Unterteilung haben", () => {
    const ohne: Muscle[] = ["biceps", "triceps", "quads", "hamstrings", "glutes", "calves"];
    for (const e of CATALOG) {
      if (ohne.includes(e.muscle)) expect(e.region, e.name).toBeNull();
    }
  });
});

describe("Ladeart", () => {
  it("steht bei jeder Übung fest — niemand muss mehr klassifizieren", () => {
    for (const e of CATALOG) expect(e.ladeart, e.name).not.toBeNull();
  });

  it("folgt dem Gerät", () => {
    for (const e of CATALOG) {
      if (e.equipment === "barbell") expect(e.ladeart, e.name).toBe("scheiben");
      if (e.equipment === "dumbbell") expect(e.ladeart, e.name).toBe("frei");
      if (e.equipment === "bodyweight") expect(e.ladeart, e.name).toBe("ohne");
    }
  });

  it("lässt sich persönlich überschreiben", () => {
    const [merged] = mergeExercises([zeile({ id: "bench-press", ladeart: "steck" })]).filter(
      (e) => e.id === "bench-press"
    );
    expect(ladeartVon(merged)).toBe("steck");
  });
});

describe("Umzug von der alten Bibliothek", () => {
  it("deckt jede benutzte Übung ab und zeigt auf Vorhandenes", () => {
    for (const [alt, neu] of Object.entries(REPDB_MIGRATION)) {
      expect(alt).toMatch(/^og-\d+$/);
      if (neu !== null) expect(catalogEntry(neu), `${alt} → ${neu}`).toBeDefined();
    }
  });

  it("paart keine zwei alten Übungen auf dieselbe neue", () => {
    // Der Fehler des ersten Anlaufs: zwei alte IDs auf eine neue, und die
    // Migration stolperte über den Primärschlüssel (user_id, id) — oder
    // vermischte den Verlauf zweier Übungen.
    const ziele = Object.values(REPDB_MIGRATION).filter((v): v is string => v !== null);
    expect(new Set(ziele).size).toBe(ziele.length);
  });
});

describe("Vorlagen und Klassiker", () => {
  it("nennen nur Übungen, die es gibt", () => {
    const fehlend = SPLIT_TEMPLATES.flatMap((t) =>
      t.days.flatMap((d) =>
        d.exercises.map((e) => e.exerciseId).filter((id) => !catalogEntry(id))
      )
    );
    expect(fehlend).toEqual([]);
  });

  it("führen keine Übung zweimal am selben Tag", () => {
    for (const t of SPLIT_TEMPLATES) {
      for (const d of t.days) {
        const ids = d.exercises.map((e) => e.exerciseId);
        expect(new Set(ids).size, `${t.name} / ${d.name}`).toBe(ids.length);
      }
    }
  });

  it("kennt jede Kern-Übung", () => {
    const fehlend = KERN_UEBUNGEN_IDS.filter((id) => !catalogEntry(id));
    expect(fehlend).toEqual([]);
  });
});

describe("mergeExercises", () => {
  it("liefert ohne Zeilen den ganzen Katalog", () => {
    expect(mergeExercises([]).length).toBe(CATALOG.length);
  });

  it("lässt eine Abweichung die Katalogwerte überschreiben, Bilder aber stehen", () => {
    const merged = mergeExercises([zeile({ id: "bench-press", name: "Meins", favorite: true })]);
    const bank = merged.find((e) => e.id === "bench-press")!;
    expect(bank.name).toBe("Meins");
    expect(bank.favorite).toBe(true);
    expect(bank.media).toBe(catalogEntry("bench-press")!.media);
    expect(bank.variationsgruppe).toBe("bench-press");
  });

  it("behält eine Zeile, die der Katalog nicht kennt", () => {
    // Genau der Fall der acht Übungen ohne Gegenstück: ohne diese Regel
    // verschwänden sie mitsamt Verlauf aus Plan und Statistik.
    const merged = mergeExercises([zeile({ id: "og-1299", name: "Lever Incline Chest Press" })]);
    const eigen = merged.find((e) => e.id === "og-1299")!;
    expect(eigen).toBeDefined();
    expect(eigen.media).toBeNull();
    expect(eigen.bilder).toEqual([]);
    expect(eigen.rank).toBe(5);
    expect(eigen.variationsgruppe).toBeNull();
  });

  it("gibt jeder eigenen Übung ihr eigenes Nebenmuskel-Feld", () => {
    const merged = mergeExercises([zeile({ id: "eigen-a" }), zeile({ id: "eigen-b" })]);
    const a = merged.find((e) => e.id === "eigen-a")!;
    const b = merged.find((e) => e.id === "eigen-b")!;
    expect(a.secondary).not.toBe(b.secondary);
  });
});
