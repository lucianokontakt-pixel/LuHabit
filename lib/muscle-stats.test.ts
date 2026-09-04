import { describe, expect, it } from "vitest";
import { muscleProgress, recentWeeks, weekStartISO } from "@/lib/muscle-stats";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/training";

const bench: Exercise = {
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
  ladeart: null,
};

const exerciseById = { bench };

function set(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "s",
    exerciseId: "bench",
    setIndex: 0,
    weight: 80,
    reps: 8,
    done: true,
    warmup: false,
    ...overrides,
  };
}

function session(id: string, date: string, sets: WorkoutSet[]): WorkoutSession {
  return {
    id,
    planId: null,
    dayId: "push",
    dayName: "Push",
    date,
    durationSeconds: null,
    note: null,
    sets,
  };
}

// Ein Donnerstag — so bleiben die Wochengrenzen im Test eindeutig.
const TODAY = new Date("2026-01-15T12:00:00");

describe("weekStartISO", () => {
  it("gibt den Montag der Woche zurück", () => {
    expect(weekStartISO("2026-01-15")).toBe("2026-01-12");
    expect(weekStartISO("2026-01-12")).toBe("2026-01-12");
  });

  it("zählt den Sonntag noch zur laufenden Woche", () => {
    expect(weekStartISO("2026-01-18")).toBe("2026-01-12");
    expect(weekStartISO("2026-01-19")).toBe("2026-01-19");
  });
});

describe("recentWeeks", () => {
  it("liefert aufsteigende Wochenanfänge mit der laufenden Woche zuletzt", () => {
    expect(recentWeeks(3, TODAY)).toEqual(["2025-12-29", "2026-01-05", "2026-01-12"]);
  });
});

describe("muscleProgress", () => {
  it("führt jede Muskelgruppe auf, auch die nie trainierte", () => {
    const progress = muscleProgress([], exerciseById, 4, TODAY);
    expect(progress).toHaveLength(10);
    expect(progress.every((p) => p.status === "none")).toBe(true);
    expect(progress.every((p) => p.weeks.length === 4)).toBe(true);
  });

  it("zählt jeden abgehakten Satz auf die Muskelgruppe der Übung", () => {
    const sessions = [session("a", "2026-01-13", [set(), set({ setIndex: 1 })])];
    const chest = muscleProgress(sessions, exerciseById, 4, TODAY).find(
      (p) => p.muscle === "chest"
    )!;
    expect(chest.currentSets).toBe(2);
    expect(chest.totalSets).toBe(2);
    expect(chest.volume).toBe(2 * 80 * 8);
  });

  it("zählt Aufwärmsätze nicht in den Wochenkorridor", () => {
    const sessions = [
      session("a", "2026-01-13", [
        set({ setIndex: 0, weight: 20, warmup: true }),
        set({ setIndex: 1 }),
      ]),
    ];
    const chest = muscleProgress(sessions, exerciseById, 4, TODAY).find(
      (p) => p.muscle === "chest"
    )!;
    expect(chest.currentSets).toBe(1);
    expect(chest.volume).toBe(80 * 8);
  });

  it("ignoriert nicht abgehakte Sätze", () => {
    const sessions = [session("a", "2026-01-13", [set({ done: false })])];
    const chest = muscleProgress(sessions, exerciseById, 4, TODAY).find(
      (p) => p.muscle === "chest"
    )!;
    expect(chest.totalSets).toBe(0);
  });

  it("lässt die laufende Woche aus dem Schnitt heraus", () => {
    const sessions = [
      // Vorwoche: 12 Sätze. Laufende Woche: 2 Sätze, noch nicht fertig.
      session(
        "a",
        "2026-01-06",
        Array.from({ length: 12 }, (_, i) => set({ setIndex: i }))
      ),
      session("b", "2026-01-13", [set(), set({ setIndex: 1 })]),
    ];
    const chest = muscleProgress(sessions, exerciseById, 3, TODAY).find(
      (p) => p.muscle === "chest"
    )!;
    // Gezählt wird ab der ersten aktiven Woche — die leere davor bleibt außen vor.
    expect(chest.averageSets).toBe(12);
    expect(chest.basis).toBe("average");
    expect(chest.currentSets).toBe(2);
  });

  it("zählt leere Wochen nach dem ersten Satz gegen den Schnitt", () => {
    const sessions = [
      session(
        "a",
        "2025-12-30",
        Array.from({ length: 12 }, (_, i) => set({ setIndex: i }))
      ),
      // Die Woche vom 05.01. bleibt leer und drückt den Schnitt.
    ];
    const chest = muscleProgress(sessions, exerciseById, 3, TODAY).find(
      (p) => p.muscle === "chest"
    )!;
    expect(chest.averageSets).toBe(6);
  });

  it("zeigt die laufende Woche, wenn es noch keine abgeschlossene gibt", () => {
    const sessions = [
      session(
        "a",
        "2026-01-13",
        Array.from({ length: 9 }, (_, i) => set({ setIndex: i }))
      ),
    ];
    const chest = muscleProgress(sessions, exerciseById, 12, TODAY).find(
      (p) => p.muscle === "chest"
    )!;
    expect(chest.basis).toBe("current");
    expect(chest.averageSets).toBe(9);
    expect(chest.status).toBe("low");
  });

  it("bewertet den Wochenkorridor", () => {
    const many = Array.from({ length: 14 }, (_, i) => set({ setIndex: i }));
    // Genau eine abgeschlossene Woche im Fenster, damit der Schnitt eindeutig ist.
    const sessions = [session("a", "2026-01-06", many)];
    const chest = muscleProgress(sessions, exerciseById, 2, TODAY).find(
      (p) => p.muscle === "chest"
    )!;
    expect(chest.averageSets).toBe(14);
    expect(chest.status).toBe("good");
  });

  it("merkt sich das letzte Training auch außerhalb des Fensters", () => {
    const sessions = [session("a", "2025-11-20", [set()])];
    const chest = muscleProgress(sessions, exerciseById, 4, TODAY).find(
      (p) => p.muscle === "chest"
    )!;
    expect(chest.lastTrained).toBe("2025-11-20");
    expect(chest.daysSince).toBe(56);
    // Im Fenster steht trotzdem nichts.
    expect(chest.totalSets).toBe(0);
  });

  it("zeigt die Kraftveränderung zwischen erster und letzter Woche mit Daten", () => {
    const sessions = [
      session("a", "2025-12-30", [set({ weight: 80, reps: 10 })]),
      session("b", "2026-01-13", [set({ weight: 90, reps: 10 })]),
    ];
    const chest = muscleProgress(sessions, exerciseById, 4, TODAY).find(
      (p) => p.muscle === "chest"
    )!;
    // Epley: 80 × (1 + 10/30) ≈ 106,7 gegen 90 × (1 + 10/30) = 120
    expect(chest.oneRmChange).toBeCloseTo(120 - 106.7, 1);
  });
});
