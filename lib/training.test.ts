import { describe, expect, it } from "vitest";
import { roundToIncrement, incrementFor, estimateOneRepMax, defaultIncrement } from "@/lib/training";
import type { Exercise, PlanExercise } from "@/lib/training";

const planExercise: PlanExercise = {
  id: "pe1",
  exerciseId: "bench",
  position: 0,
  sets: 3,
  repMin: 8,
  repMax: 12,
  restSeconds: 120,
  increment: 1.25,
  startWeight: null,
};

const exercise: Exercise = {
  id: "bench",
  name: "Bankdrücken",
  muscle: "chest",
  equipment: "barbell",
  isCustom: false,
  hidden: false,
  favorite: false,
  increment: null,
  bodyweightFactor: null,
  loadFactor: null,
  warmup: null,
  media: null,
  secondary: [],
  en: null,
  region: null,
  rank: 5,
  rating: null,
};

describe("defaultIncrement", () => {
  it("nimmt 2,5kg für Oberkörper-Muskeln", () => {
    expect(defaultIncrement("chest")).toBe(2.5);
  });

  it("nimmt 5kg für Unterkörper-Muskeln", () => {
    expect(defaultIncrement("quads")).toBe(5);
  });
});

describe("roundToIncrement", () => {
  it("rundet auf das nächste Vielfache", () => {
    expect(roundToIncrement(81.3, 2.5)).toBe(82.5);
    expect(roundToIncrement(83.8, 2.5)).toBe(85);
  });

  it("rundet ohne Sprung auf eine Nachkommastelle", () => {
    expect(roundToIncrement(81.34, 0)).toBe(81.3);
  });
});

describe("incrementFor", () => {
  it("nimmt den Plan-Override, wenn gesetzt", () => {
    expect(incrementFor(exercise, planExercise)).toBe(1.25);
  });

  it("fällt auf den Übungs-Override zurück", () => {
    expect(incrementFor({ ...exercise, increment: 5 })).toBe(5);
  });

  it("fällt zuletzt auf den Muskel-Standard zurück", () => {
    expect(incrementFor(exercise)).toBe(2.5);
  });
});

describe("estimateOneRepMax (Epley)", () => {
  it("gibt bei einer Wiederholung das Gewicht selbst zurück", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it("schätzt für mehrere Wiederholungen höher", () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(100 * (1 + 5 / 30), 5);
  });

  it("gibt 0 zurück für ungültige Eingaben", () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});
