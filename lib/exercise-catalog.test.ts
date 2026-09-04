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
import {
  CUSTOM_RANK,
  EQUIPMENT,
  MUSCLES,
  RANK_SICHTBAR_AB,
  REGIONS,
  stufeVon,
} from "@/lib/training";

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

describe("Beliebtheit", () => {
  it("gibt jeder Übung eine ganze Stufe zwischen 1 und 5", () => {
    const daneben = CATALOG.filter(
      (e) => !Number.isInteger(e.rank) || e.rank < 1 || e.rank > 5
    );
    expect(daneben.map((e) => `${e.id} ${e.rank}`)).toEqual([]);
  });

  it("blendet nicht mehr als ein Fünftel der Bibliothek aus", () => {
    // Der Sinn der Stufe ist, den Rand wegzuräumen, nicht die Mitte. Wächst
    // die Liste in scripts/exercise-beliebtheit.mjs über dieses Maß hinaus,
    // filtert sie nicht mehr — dann versteckt sie.
    const versteckt = CATALOG.filter((e) => e.rank < RANK_SICHTBAR_AB);
    expect(versteckt.length).toBeLessThan(CATALOG.length / 5);
  });

  it("lässt kein echtes Gerät vollständig verschwinden", () => {
    // Ein Gerätefilter, der nie einen Treffer hat, ist kaputt und nicht
    // streng. Zwei Ausnahmen sind gewollt: der Ball ist der Anlass für die
    // ganze Stufe, und "Sonstiges" ist der Restehaufen — dort stehen nur
    // Dehnübungen, Seile, Reifen und Faszienrollen, keine einzige Übung, die
    // in einem Krafttagebuch von selbst auftauchen sollte. Wer sie sucht,
    // legt den Schalter um.
    for (const eq of EQUIPMENT) {
      if (eq === "ball" || eq === "other") continue;
      const alle = CATALOG.filter((e) => e.equipment === eq);
      if (alle.length === 0) continue;
      const sichtbar = alle.filter((e) => e.rank >= RANK_SICHTBAR_AB);
      expect(sichtbar.length, eq).toBeGreaterThan(0);
    }
  });

  it("stuft Ball und Sonstiges unter die Sichtbarkeitsgrenze", () => {
    // Der Anlass für die ganze Stufe: Gymnastikbälle sollen nicht zwischen
    // Bank und Maschine stehen.
    const rand = CATALOG.filter(
      (e) => e.equipment === "ball" || e.equipment === "other"
    );
    expect(rand.filter((e) => e.rank >= RANK_SICHTBAR_AB).map((e) => e.name)).toEqual([]);
  });

  it("lässt das eigene Urteil die Schätzung schlagen", () => {
    const uebung = fromCatalog(CATALOG[0]);
    expect(stufeVon(uebung)).toBe(uebung.rank);
    expect(stufeVon({ ...uebung, rating: 1 })).toBe(1);
  });
});

describe("Startgewicht", () => {
  it("schätzt für jede Übung mit Gerät, für keine ohne", () => {
    const falsch = CATALOG.filter((e) =>
      e.equipment === "bodyweight" ? e.startFactor !== null : e.startFactor === null
    );
    expect(falsch.map((e) => `${e.name} (${e.equipment})`)).toEqual([]);
  });

  it("bleibt in einem Rahmen, den ein Mensch heben kann", () => {
    // Über dem Eineinhalbfachen des Körpergewichts anzufangen ist kein
    // Vorschlag mehr, sondern ein Vorwurf.
    const daneben = CATALOG.filter(
      (e) => e.startFactor !== null && (e.startFactor <= 0 || e.startFactor > 1.5)
    );
    expect(daneben.map((e) => `${e.name} ${e.startFactor}`)).toEqual([]);
  });

  it("lässt die von Hand gesetzten Werte gewinnen", () => {
    for (const [id, d] of Object.entries(CATALOG_DEFAULTS)) {
      const entry = catalogEntry(id);
      if (!entry) continue;
      expect(fromCatalog(entry).bodyweightFactor, entry.name).toBe(d.factor);
    }
  });

  it("gibt Drücken mehr als Fliegenden am selben Gerät", () => {
    // Die halbe Begründung der ganzen Tabelle: der Unterschied zwischen zwei
    // Bewegungen ist größer als der zwischen zwei Muskelgruppen.
    const druecken = CATALOG.find((e) => e.name === "Dumbbell Bench Press");
    const fliegende = CATALOG.find((e) => e.name === "Dumbbell Fly");
    expect(druecken?.startFactor).toBeGreaterThan(fliegende?.startFactor ?? 0);
  });
});

describe("Regionen", () => {
  it("vergibt nur Regionen, die zur Muskelgruppe der Übung gehören", () => {
    const erlaubt = new Map(REGIONS.map((r) => [r.key, r.muscle]));
    const falsch = CATALOG.filter(
      (e) => e.region !== null && erlaubt.get(e.region) !== e.muscle
    );
    expect(falsch.map((e) => `${e.id} ${e.muscle}/${e.region}`)).toEqual([]);
  });

  it("teilt Brust, Schultern, Rücken und Rumpf auf", () => {
    for (const muscle of ["chest", "shoulders", "back", "core"] as const) {
      const alle = CATALOG.filter((e) => e.muscle === muscle);
      const mitRegion = alle.filter((e) => e.region !== null);
      // Nicht jede Übung bekommt eine — aber die Mehrheit muss, sonst ist der
      // Filter für diese Gruppe eine leere Zusage.
      expect(mitRegion.length, muscle).toBeGreaterThan(alle.length / 2);
    }
  });

  it("lässt die sechs Muskelgruppen ohne Untergruppen in Ruhe", () => {
    // Bizeps weiter zu unterteilen hilft niemandem, der vor einem Gerät steht.
    const ohne = ["biceps", "triceps", "quads", "hamstrings", "glutes", "calves"];
    const mit = CATALOG.filter((e) => ohne.includes(e.muscle) && e.region !== null);
    expect(mit.map((e) => e.id)).toEqual([]);
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
    rating: null,
    ladeart: null,
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
    const gefunden = merged.find((e) => e.id === "eigene-uebung");
    expect(gefunden?.media).toBeNull();
    // Wer sie selbst angelegt hat, will sie sehen — nie im ausgeblendeten Teil.
    expect(gefunden?.rank).toBe(CUSTOM_RANK);
    expect(gefunden?.region).toBeNull();
  });

  it("gibt jeder eigenen Übung ein eigenes secondary-Array", () => {
    const [a, b] = mergeExercises([
      { ...record, id: "eigen-a", isCustom: true },
      { ...record, id: "eigen-b", isCustom: true },
    ]).filter((e) => e.id.startsWith("eigen-"));
    expect(a.secondary).not.toBe(b.secondary);
  });

  it("übernimmt Region und Stufe aus dem Katalog, das Urteil aus der Zeile", () => {
    const merged = mergeOne({ ...record, rating: 2 });
    expect(merged.rank).toBe(catalogEntry("og-0025")?.rank);
    expect(merged.region).toBe(catalogEntry("og-0025")?.region);
    expect(stufeVon(merged)).toBe(2);
  });
});
