import { describe, expect, it } from "vitest";
import { addDaysISO } from "@/lib/habits";
import { formatDayLabel } from "@/lib/format";

describe("addDaysISO", () => {
  it("zählt vorwärts und rückwärts", () => {
    expect(addDaysISO("2026-08-19", -1)).toBe("2026-08-18");
    expect(addDaysISO("2026-08-19", 1)).toBe("2026-08-20");
    expect(addDaysISO("2026-08-19", 0)).toBe("2026-08-19");
  });

  it("trägt über Monats- und Jahresgrenzen", () => {
    expect(addDaysISO("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDaysISO("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("kennt den Schalttag", () => {
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysISO("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("überlebt die Zeitumstellung", () => {
    // In Deutschland wird Ende März vor- und Ende Oktober zurückgestellt.
    // Über Date + setDate gerechnet bleibt der Tageswechsel trotzdem sauber.
    expect(addDaysISO("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDaysISO("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDaysISO("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDaysISO("2026-10-25", 1)).toBe("2026-10-26");
  });
});

describe("formatDayLabel", () => {
  const heute = "2026-08-19";

  it("benennt die beiden nächstliegenden Tage", () => {
    expect(formatDayLabel(heute, heute)).toBe("Heute");
    expect(formatDayLabel("2026-08-18", heute)).toBe("Gestern");
  });

  it("schreibt ältere Tage mit Wochentag aus", () => {
    expect(formatDayLabel("2026-08-17", heute)).toBe("Mo, 17. Aug");
  });

  it("rechnet über den Monatsanfang zurück", () => {
    expect(formatDayLabel("2026-07-31", "2026-08-01")).toBe("Gestern");
  });
});
