import { describe, expect, it } from "vitest";
import {
  CATALOG,
  catalogEntry,
  fromCatalog,
  mergeExercises,
  mergeOne,
} from "@/lib/exercise-catalog";
import { CATALOG_DEFAULTS, LEGACY_EXERCISE_MAP } from "@/lib/exercise-legacy-map";
import { SPLIT_TEMPLATES } from "@/lib/exercise-seed";
import { EQUIPMENT, MUSCLES } from "@/lib/training";

const MUSCLE_KEYS = new Set(MUSCLES.map((m) => m.key));
const EQUIPMENT_KEYS = new Set(EQUIPMENT);

describe("Katalog", () => {
  it("vergibt jede ID nur einmal", () => {
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Namen dürfen sich wiederholen: sie stehen 1:1 wie im openGym-Datensatz,
  // und der enthält selbst ein halbes Dutzend echter Dubletten (z. B. zwei
  // "Lever Chest Press" mit verschiedener ID). Eindeutig gemacht wurde hier
  // bewusst nichts — das wäre keine Wiederherstellung des Originals mehr.
  it("lässt IDs auch bei doppeltem Namen unterscheidbar", () => {
    const byName = new Map<string, string[]>();
    for (const e of CATALOG) {
      byName.set(e.name, [...(byName.get(e.name) ?? []), e.id]);
    }
    for (const ids of byName.values()) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("kennt nur Muskelgruppen und Geräte, die die App anzeigen kann", () => {
    const fremd = CATALOG.filter(
      (e) => !MUSCLE_KEYS.has(e.muscle) || !EQUIPMENT_KEYS.has(e.equipment)
    );
    expect(fremd.map((e) => e.id)).toEqual([]);
  });

  it("hat zu jeder Übung ein Medienkürzel", () => {
    expect(CATALOG.filter((e) => !e.media).map((e) => e.id)).toEqual([]);
  });

  it("gibt jeder Eigengewichtsübung einen Lastanteil", () => {
    // Ohne ihn zählten Klimmzüge und Dips im Volumen mit 0 kg.
    const ohne = CATALOG.map(fromCatalog).filter(
      (e) => e.equipment === "bodyweight" && e.loadFactor === null
    );
    expect(ohne.map((e) => e.id)).toEqual([]);
  });

  it("hält die übernommenen Lastanteile in einem plausiblen Rahmen", () => {
    for (const [id, d] of Object.entries(CATALOG_DEFAULTS)) {
      if (d.load === undefined || d.load === null) continue;
      expect(d.load, id).toBeGreaterThanOrEqual(0);
      expect(d.load, id).toBeLessThanOrEqual(1);
    }
  });
});

describe("Zuordnung der alten Bibliothek", () => {
  it("zeigt nur auf Übungen, die es im Katalog gibt", () => {
    const kaputt = Object.entries(LEGACY_EXERCISE_MAP)
      .filter(([, neu]) => neu !== null && !catalogEntry(neu))
      .map(([alt]) => alt);
    expect(kaputt).toEqual([]);
  });

  it("bildet keine zwei alten Übungen auf dieselbe neue ab", () => {
    const ziele = Object.values(LEGACY_EXERCISE_MAP).filter((v) => v !== null);
    expect(new Set(ziele).size).toBe(ziele.length);
  });

  it("kennt jede ID, für die es Faktoren übernommen hat", () => {
    const fremd = Object.keys(CATALOG_DEFAULTS).filter((id) => !catalogEntry(id));
    expect(fremd).toEqual([]);
  });
});

describe("SPLIT_TEMPLATES", () => {
  it("verweist nur auf Übungen, die es im Katalog gibt", () => {
    const fehlend = SPLIT_TEMPLATES.flatMap((t) =>
      t.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
    ).filter((id) => !catalogEntry(id));
    expect([...new Set(fehlend)]).toEqual([]);
  });
});

describe("mergeExercises", () => {
  const record = {
    id: "og-0025",
    name: "Mein Bankdrücken",
    muscle: "chest" as const,
    equipment: "barbell" as const,
    isCustom: false,
    hidden: true,
    favorite: false,
    increment: 1.25,
    bodyweightFactor: null,
    loadFactor: null,
    warmup: "always" as const,
  };

  it("liefert ohne eigene Zeilen genau den Katalog", () => {
    expect(mergeExercises([])).toHaveLength(CATALOG.length);
  });

  it("legt eigene Werte über die Katalogübung, behält aber die Medien", () => {
    const merged = mergeOne(record);
    expect(merged.name).toBe("Mein Bankdrücken");
    expect(merged.hidden).toBe(true);
    expect(merged.increment).toBe(1.25);
    expect(merged.media).toBe(catalogEntry("og-0025")?.media);
  });

  it("nimmt Zeilen mit, die der Katalog nicht kennt", () => {
    const eigen = { ...record, id: "eigene-uebung", isCustom: true };
    const merged = mergeExercises([eigen]);
    expect(merged).toHaveLength(CATALOG.length + 1);
    expect(merged.find((e) => e.id === "eigene-uebung")?.media).toBeNull();
  });
});
