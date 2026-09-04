import { describe, expect, it } from "vitest";
import { needsWarmup, warmupWeight } from "@/lib/warmup";
import type { Exercise } from "@/lib/training";

const exercise: Exercise = {
  id: "bench",
  name: "Bankdrücken",
  muscle: "chest",
  equipment: "barbell",
  isCustom: false,
  taste: 0,
  versteckt: false,
  versteckRegeln: [],
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
  ladeart: null,
};

describe("needsWarmup", () => {
  it("gibt der ersten Übung immer einen Aufwärmsatz, egal wie leicht", () => {
    expect(needsWarmup({ exercise, isFirst: true, weight: 10 })).toBe(true);
  });

  it("verzichtet bei späteren Übungen unter der Schwelle", () => {
    expect(needsWarmup({ exercise, isFirst: false, weight: 30 })).toBe(false);
  });

  it("gibt späteren Übungen ab der Schwelle einen Aufwärmsatz", () => {
    expect(needsWarmup({ exercise, isFirst: false, weight: 40 })).toBe(true);
  });

  it("respektiert 'always' auch unter der Schwelle", () => {
    expect(needsWarmup({ exercise: { ...exercise, warmup: "always" }, isFirst: false, weight: 10 })).toBe(
      true
    );
  });

  it("respektiert 'never' auch bei der ersten Übung", () => {
    expect(needsWarmup({ exercise: { ...exercise, warmup: "never" }, isFirst: true, weight: 100 })).toBe(
      false
    );
  });

  it("verzichtet bei Eigengewicht, unabhängig von der Automatik", () => {
    const bodyweight: Exercise = { ...exercise, equipment: "bodyweight" };
    expect(needsWarmup({ exercise: bodyweight, isFirst: true, weight: 0 })).toBe(false);
  });

  it("verzichtet ohne Gewicht", () => {
    expect(needsWarmup({ exercise, isFirst: true, weight: 0 })).toBe(false);
  });
});

describe("warmupWeight", () => {
  it("rechnet 55 % vom Arbeitsgewicht, gerundet auf den Sprung", () => {
    expect(warmupWeight(60, 2.5)).toBe(32.5);
  });

  it("rundet auf mindestens einen Sprung", () => {
    expect(warmupWeight(5, 2.5)).toBe(2.5);
  });

  it("gibt null zurück ohne Gewicht", () => {
    expect(warmupWeight(0, 2.5)).toBeNull();
  });

  it("gibt null zurück, wenn die Rundung auf das Arbeitsgewicht selbst fällt", () => {
    // 55 % von 5 kg mit 5-kg-Sprung rundet auf 5 kg — kein sinnvoller Aufwärmsatz mehr.
    expect(warmupWeight(5, 5)).toBeNull();
  });
});
