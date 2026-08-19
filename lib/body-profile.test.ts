import { describe, expect, it } from "vitest";
import {
  basalMetabolicRate,
  bodyMassIndex,
  bmiCategory,
  isPlausibleHeight,
} from "@/lib/body-profile";

describe("basalMetabolicRate (Mifflin-St Jeor)", () => {
  it("rechnet für Männer +5", () => {
    const bmr = basalMetabolicRate({ gender: "male", weight: 80, height: 180, age: 30 });
    expect(bmr).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 30 + 5, 5);
  });

  it("rechnet für Frauen -161", () => {
    const bmr = basalMetabolicRate({ gender: "female", weight: 65, height: 165, age: 30 });
    expect(bmr).toBeCloseTo(10 * 65 + 6.25 * 165 - 5 * 30 - 161, 5);
  });

  it("gibt null zurück, solange ein Wert fehlt", () => {
    expect(basalMetabolicRate({ gender: "male", weight: 0, height: 180, age: 30 })).toBeNull();
    expect(basalMetabolicRate({ gender: "male", weight: 80, height: 0, age: 30 })).toBeNull();
    expect(basalMetabolicRate({ gender: "male", weight: 80, height: 180, age: 0 })).toBeNull();
  });
});

describe("isPlausibleHeight", () => {
  it("akzeptiert normale Körpergrößen", () => {
    expect(isPlausibleHeight(180)).toBe(true);
  });

  it("lehnt Tippfehler wie 65 statt 165 ab", () => {
    expect(isPlausibleHeight(65)).toBe(false);
  });

  it("lehnt unrealistisch große Werte ab", () => {
    expect(isPlausibleHeight(300)).toBe(false);
  });
});

describe("bodyMassIndex", () => {
  it("berechnet den BMI korrekt", () => {
    expect(bodyMassIndex(70, 175)).toBeCloseTo(22.86, 2);
  });

  it("gibt null zurück bei unplausibler Größe (Tippfehler-Schutz)", () => {
    expect(bodyMassIndex(70, 65)).toBeNull();
  });

  it("gibt null zurück bei Gewicht 0", () => {
    expect(bodyMassIndex(0, 175)).toBeNull();
  });
});

describe("bmiCategory", () => {
  it("kategorisiert an den Standard-Schwellen", () => {
    expect(bmiCategory(17)).toBe("Untergewicht");
    expect(bmiCategory(22)).toBe("Normalgewicht");
    expect(bmiCategory(27)).toBe("Übergewicht");
    expect(bmiCategory(32)).toBe("Adipositas");
  });

  it("behandelt die Schwellenwerte selbst als 'ab hier'", () => {
    expect(bmiCategory(18.5)).toBe("Normalgewicht");
    expect(bmiCategory(25)).toBe("Übergewicht");
    expect(bmiCategory(30)).toBe("Adipositas");
  });
});
