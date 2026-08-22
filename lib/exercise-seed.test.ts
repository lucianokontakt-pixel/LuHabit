import { describe, expect, it } from "vitest";
import { SEED_EXERCISES, SPLIT_TEMPLATES } from "@/lib/exercise-seed";

describe("SEED_EXERCISES", () => {
  it("vergibt jede ID nur einmal", () => {
    const ids = SEED_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gibt jeder Eigengewichtsübung einen Lastanteil", () => {
    // Ohne ihn zählte ein frisch angelegtes Konto — und jedes "Einrichtung
    // zurücksetzen" — Klimmzüge und Dips wieder mit 0 kg.
    const ohne = SEED_EXERCISES.filter(
      (e) => e.equipment === "bodyweight" && e.load === undefined
    );
    expect(ohne.map((e) => e.id)).toEqual([]);
  });

  it("hängt keinen Lastanteil an Hantelübungen", () => {
    const falsch = SEED_EXERCISES.filter(
      (e) => e.equipment !== "bodyweight" && e.load !== undefined
    );
    expect(falsch.map((e) => e.id)).toEqual([]);
  });

  it("hält die Lastanteile in einem plausiblen Rahmen", () => {
    for (const e of SEED_EXERCISES) {
      if (e.load === undefined || e.load === null) continue;
      expect(e.load, e.id).toBeGreaterThanOrEqual(0);
      expect(e.load, e.id).toBeLessThanOrEqual(1);
    }
  });
});

describe("SPLIT_TEMPLATES", () => {
  it("verweist nur auf Übungen, die es in der Bibliothek gibt", () => {
    const known = new Set(SEED_EXERCISES.map((e) => e.id));
    const fehlend = SPLIT_TEMPLATES.flatMap((t) =>
      t.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
    ).filter((id) => !known.has(id));
    expect([...new Set(fehlend)]).toEqual([]);
  });
});
