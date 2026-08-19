import { describe, expect, it } from "vitest";
import { computeStreaks, sum, average, monthRange, monthlyTotal } from "@/lib/stats";
import type { Entry } from "@/lib/api-client";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("sv-SE");
}

function entry(daysAgo: number, value: number): Entry {
  return { habit: "steps", date: isoDaysAgo(daysAgo), value };
}

describe("computeStreaks", () => {
  it("zählt eine laufende Streak bis heute", () => {
    const entries = [entry(2, 10), entry(1, 10), entry(0, 10)];
    expect(computeStreaks(entries, 5).current).toBe(3);
  });

  it("bricht die Streak an einem verpassten Tag ab", () => {
    const entries = [entry(3, 10), entry(2, 10), entry(0, 10)];
    // Tag "vor 1" fehlt -> Streak reißt, nur der heutige Tag zählt noch.
    expect(computeStreaks(entries, 5).current).toBe(1);
  });

  it("lässt den heutigen Tag offen, solange er noch nicht erfüllt ist", () => {
    const entries = [entry(2, 10), entry(1, 10)];
    // Heute (0) hat noch keinen Eintrag — soll die Streak nicht abbrechen.
    expect(computeStreaks(entries, 5).current).toBe(2);
  });

  it("findet die längste Streak auch wenn sie nicht die aktuelle ist", () => {
    const entries = [entry(10, 10), entry(9, 10), entry(9 - 1, 10), entry(0, 10)];
    const result = computeStreaks(entries, 5, 30);
    expect(result.longest).toBeGreaterThanOrEqual(3);
    expect(result.current).toBe(1);
  });

  it("zählt nur Tage, die das Ziel erreichen", () => {
    const entries = [entry(2, 3), entry(1, 10), entry(0, 10)];
    // Tag "vor 2" verfehlt das Ziel von 5 -> Streak startet erst danach.
    expect(computeStreaks(entries, 5).current).toBe(2);
  });
});

describe("sum / average", () => {
  it("summiert alle Werte", () => {
    expect(sum([entry(1, 10), entry(0, 5)])).toBe(15);
  });

  it("teilt die Summe durch die angegebene Tagesanzahl", () => {
    expect(average([entry(1, 10), entry(0, 10)], 4)).toBe(5);
  });

  it("dividiert nicht durch 0", () => {
    expect(average([entry(0, 10)], 0)).toBe(0);
  });
});

describe("monthRange / monthlyTotal", () => {
  it("liefert die letzten n Monate inklusive des aktuellen", () => {
    const buckets = monthRange(3);
    expect(buckets).toHaveLength(3);
    expect(buckets[2].key).toBe(
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
    );
  });

  it("summiert nur Einträge des jeweiligen Monats", () => {
    const bucket = monthRange(1)[0];
    const inMonth: Entry = { habit: "weight", date: `${bucket.key}-05`, value: 100 };
    const outsideMonth: Entry = { habit: "weight", date: "1999-01-01", value: 999 };
    expect(monthlyTotal([inMonth, outsideMonth], bucket)).toBe(100);
  });
});
