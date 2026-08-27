import { describe, expect, it } from "vitest";
import {
  bodyMassIndex,
  bmiCategory,
  isPlausibleHeight,
} from "@/lib/body-profile";

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
