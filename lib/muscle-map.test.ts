import { describe, expect, it } from "vitest";
import { ohneKatalog } from "@/lib/exercise-catalog";
import {
  MAP_AREAS,
  SILHOUETTE,
  mapLevels,
  setsPerMuscle,
  untrainedMuscles,
} from "@/lib/muscle-map";
import { MUSCLES, type Exercise, type WorkoutSession, type WorkoutSet } from "@/lib/training";
import bodyPaths from "@/lib/body-paths";

function exercise(id: string, muscle: Exercise["muscle"]): Exercise {
  return {
    id,
    name: id,
    muscle,
    equipment: "barbell",
    isCustom: false,
    hidden: false,
    favorite: false,
    increment: null,
    bodyweightFactor: null,
    loadFactor: null,
    warmup: null,
    ...ohneKatalog(),
    en: null,
  region: null,
  rating: null,
  ladeart: null,
  };
}

function set(exerciseId: string, overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "s",
    exerciseId,
    setIndex: 0,
    weight: 60,
    reps: 8,
    done: true,
    warmup: false,
    ...overrides,
  };
}

function session(sets: WorkoutSet[]): WorkoutSession {
  return {
    id: "w",
    planId: "p",
    dayId: "d",
    dayName: "Upper",
    date: "2026-08-26",
    durationSeconds: 3600,
    note: null,
    sets,
  };
}

const byId: Record<string, Exercise> = {
  bank: exercise("bank", "chest"),
  rudern: exercise("rudern", "back"),
  curls: exercise("curls", "biceps"),
};

describe("setsPerMuscle", () => {
  it("zählt Arbeitssätze je Gruppe", () => {
    const tally = setsPerMuscle(
      [session([set("bank"), set("bank"), set("rudern")])],
      byId
    );
    expect(tally).toEqual({ chest: 2, back: 1 });
  });

  it("lässt Aufwärmsätze und offene Sätze weg", () => {
    const tally = setsPerMuscle(
      [session([set("bank", { warmup: true }), set("bank", { done: false }), set("bank")])],
      byId
    );
    expect(tally).toEqual({ chest: 1 });
  });

  it("ignoriert Sätze zu Übungen, die es nicht mehr gibt", () => {
    expect(setsPerMuscle([session([set("geloescht")])], byId)).toEqual({});
  });
});

describe("mapLevels", () => {
  it("misst an der am härtesten gearbeiteten Gruppe", () => {
    const levels = mapLevels({ chest: 20, back: 10, biceps: 1 });
    expect(levels.chest).toBe(4);
    expect(levels["upper-back"]).toBe(2);
    // Auch ein einziger Satz ist Training und bekommt mindestens Stufe 1.
    expect(levels.biceps).toBe(1);
  });

  it("färbt jede Fläche einer Gruppe gleich", () => {
    const levels = mapLevels({ back: 12 });
    expect(levels["upper-back"]).toBe(4);
    expect(levels["lower-back"]).toBe(4);
    expect(levels.trapezius).toBe(4);
  });

  it("lässt untrainierte Gruppen auf null", () => {
    const levels = mapLevels({ chest: 8 });
    expect(levels.quadriceps).toBe(0);
  });

  it("kommt mit einem leeren Zeitraum klar", () => {
    const levels = mapLevels({});
    expect(Object.values(levels).every((l) => l === 0)).toBe(true);
  });
});

describe("untrainedMuscles", () => {
  it("nennt die Gruppen ohne einen Satz", () => {
    expect(untrainedMuscles({ chest: 4, back: 2 })).not.toContain("chest");
    expect(untrainedMuscles({ chest: 4, back: 2 })).toContain("quads");
  });
});

describe("Zuordnung zur Zeichnung", () => {
  const drawable = new Set([
    ...Object.keys(bodyPaths.male.front.p),
    ...Object.keys(bodyPaths.male.back.p),
    ...Object.keys(bodyPaths.female.front.p),
    ...Object.keys(bodyPaths.female.back.p),
  ]);

  it("kennt jede Muskelgruppe der Bibliothek", () => {
    for (const { key } of MUSCLES) expect(MAP_AREAS[key]?.length).toBeGreaterThan(0);
  });

  it("zeigt auf Flächen, die es in der Zeichnung wirklich gibt", () => {
    for (const areas of Object.values(MAP_AREAS)) {
      for (const area of areas) expect(drawable).toContain(area);
    }
  });

  it("lässt keine Fläche der Zeichnung unbehandelt", () => {
    const covered = new Set([...Object.values(MAP_AREAS).flat(), ...SILHOUETTE]);
    for (const area of drawable) expect(covered).toContain(area);
  });
});
