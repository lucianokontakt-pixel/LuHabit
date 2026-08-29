import { describe, expect, it } from "vitest";
import { STATISTIK_TABS, activeSubTab, isActiveLink } from "@/lib/nav-links";

describe("activeSubTab", () => {
  it("hebt auf einer Unterseite nur den eigenen Reiter hervor", () => {
    // Der Fall, der es in die App geschafft hat: „/statistik" passt per Präfix
    // auch auf /statistik/koerper, und beide Reiter leuchteten.
    expect(activeSubTab(STATISTIK_TABS, "/statistik/koerper")).toBe("/statistik/koerper");
    expect(activeSubTab(STATISTIK_TABS, "/statistik/progression")).toBe(
      "/statistik/progression"
    );
  });

  it("hebt auf der Wurzel des Bereichs die Wurzel hervor", () => {
    expect(activeSubTab(STATISTIK_TABS, "/statistik")).toBe("/statistik");
  });

  it("hängt nicht an der Reihenfolge der Reiter", () => {
    const gedreht = [...STATISTIK_TABS].reverse();
    expect(activeSubTab(gedreht, "/statistik/koerper")).toBe("/statistik/koerper");
    expect(activeSubTab(gedreht, "/statistik")).toBe("/statistik");
  });

  it("nimmt Unterseiten eines Reiters für diesen Reiter", () => {
    const tabs = [
      { href: "/plaene", label: "Pläne" },
      { href: "/plaene/vorlagen", label: "Vorlagen" },
    ];
    expect(activeSubTab(tabs, "/plaene/abc123")).toBe("/plaene");
    expect(activeSubTab(tabs, "/plaene/vorlagen/xyz")).toBe("/plaene/vorlagen");
  });

  it("liefert null außerhalb des Bereichs", () => {
    expect(activeSubTab(STATISTIK_TABS, "/uebungen")).toBeNull();
    // Kein Treffer über Wortgrenzen hinweg: /statistikfoo gehört nirgendwohin.
    expect(activeSubTab(STATISTIK_TABS, "/statistikfoo")).toBeNull();
  });

  it("genau ein Reiter ist aktiv, auf jeder Seite des Bereichs", () => {
    for (const pfad of ["/statistik", "/statistik/koerper", "/statistik/progression"]) {
      const aktiv = STATISTIK_TABS.filter((t) => activeSubTab(STATISTIK_TABS, pfad) === t.href);
      expect(aktiv).toHaveLength(1);
    }
  });
});

describe("isActiveLink", () => {
  it("lässt den Statistik-Reiter im ganzen Bereich leuchten", () => {
    // Die untere Leiste zeigt auf /statistik/koerper, soll aber im ganzen
    // Bereich aktiv sein — dafür trägt der Eintrag activePrefix.
    expect(isActiveLink("/statistik", "/statistik/progression")).toBe(true);
    expect(isActiveLink("/statistik", "/statistik")).toBe(true);
  });

  it("zählt die laufende Einheit zur Startseite", () => {
    expect(isActiveLink("/", "/session")).toBe(true);
    expect(isActiveLink("/", "/einheit/abc")).toBe(true);
    expect(isActiveLink("/", "/plaene")).toBe(false);
  });
});
