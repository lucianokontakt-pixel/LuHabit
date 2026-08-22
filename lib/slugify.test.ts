import { describe, expect, it } from "vitest";
import { dedupeSlug, slugifyExercise, slugifyHabit } from "@/lib/slugify";

describe("slugifyHabit", () => {
  it("macht aus einem Namen einen Bezeichner", () => {
    expect(slugifyHabit("Lesen")).toBe("lesen");
    expect(slugifyHabit("Mehr Wasser trinken")).toBe("mehr-wasser-trinken");
  });

  it("entfernt Akzente, ersetzt Umlaute aber NICHT zu ae/oe/ue", () => {
    // Bewusst anders als slugifyExercise — dieses Verhalten ist historisch so
    // und darf sich für bestehende Habits nicht ändern.
    expect(slugifyHabit("Übung")).toBe("ubung");
  });

  it("fällt auf 'habit' zurück, wenn nichts übrig bleibt", () => {
    expect(slugifyHabit("!!!")).toBe("habit");
    expect(slugifyHabit("")).toBe("habit");
  });
});

describe("slugifyExercise", () => {
  it("ersetzt Umlaute vor der Normalisierung", () => {
    expect(slugifyExercise("Bankdrücken (Langhantel)")).toBe("bankdruecken-langhantel");
    expect(slugifyExercise("Überzüge")).toBe("ueberzuege");
  });

  it("fällt auf 'uebung' zurück, wenn nichts übrig bleibt", () => {
    expect(slugifyExercise("!!!")).toBe("uebung");
  });
});

describe("dedupeSlug", () => {
  it("gibt die Basis zurück, wenn sie frei ist", () => {
    expect(dedupeSlug("lesen", [])).toBe("lesen");
    expect(dedupeSlug("lesen", ["schreiben"])).toBe("lesen");
  });

  it("hängt eine Zahl an, wenn die Basis belegt ist", () => {
    expect(dedupeSlug("lesen", ["lesen"])).toBe("lesen-2");
  });

  it("findet die nächste freie Zahl, wenn mehrere belegt sind", () => {
    expect(dedupeSlug("lesen", ["lesen", "lesen-2", "lesen-3"])).toBe("lesen-4");
  });

  it("überspringt eine Lücke nicht", () => {
    // lesen-2 ist frei, auch wenn lesen-3 schon existiert
    expect(dedupeSlug("lesen", ["lesen", "lesen-3"])).toBe("lesen-2");
  });
});
