import { describe, expect, it } from "vitest";
import { trainingWeekSummary } from "@/lib/training-weeks";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/training";

const bench: Exercise = {
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

function session(id: string, date: string, sets: WorkoutSet[] = [set()]): WorkoutSession {
  return { id, planId: null, dayId: "push", dayName: "Push", date, durationSeconds: null, note: null, sets };
}

// Donnerstag der Woche, die am Montag 2026-03-16 beginnt — "heute" muss nach
// den Testdaten der laufenden Woche liegen, sonst gelten sie als Zukunft und
// fallen aus dem Fenster.
const today = new Date("2026-03-19T12:00:00");

describe("trainingWeekSummary", () => {
  it("zählt trainierte Tage der laufenden Woche, nicht Einheiten", () => {
    const sessions = [
      session("a", "2026-03-16"),
      session("b", "2026-03-16"), // zweite Einheit am selben Tag
      session("c", "2026-03-18"),
    ];
    const summary = trainingWeekSummary(sessions, exerciseById, 3, 4, today);
    expect(summary.thisWeekCount).toBe(2);
  });

  it("erkennt das erreichte Wochenziel", () => {
    const sessions = [
      session("a", "2026-03-16"),
      session("b", "2026-03-17"),
      session("c", "2026-03-18"),
    ];
    const summary = trainingWeekSummary(sessions, exerciseById, 3, 4, today);
    expect(summary.weeks[summary.weeks.length - 1].goalMet).toBe(true);
  });

  it("bricht die laufende Serie nicht durch eine noch offene Woche", () => {
    // Drei volle Vorwochen, die laufende Woche hat erst einen Tag.
    const sessions = [
      session("w1a", "2026-03-02"),
      session("w1b", "2026-03-03"),
      session("w1c", "2026-03-04"),
      session("w2a", "2026-03-09"),
      session("w2b", "2026-03-10"),
      session("w2c", "2026-03-11"),
      session("w3a", "2026-03-16"),
    ];
    const summary = trainingWeekSummary(sessions, exerciseById, 3, 4, today);
    expect(summary.currentStreak).toBe(2);
  });

  it("bricht die Serie an einer verpassten abgeschlossenen Woche", () => {
    const sessions = [
      session("w1a", "2026-03-02"),
      session("w1b", "2026-03-03"),
      session("w1c", "2026-03-04"),
      // Woche 2 (09.–15.) bleibt leer.
      session("w3a", "2026-03-16"),
      session("w3b", "2026-03-17"),
      session("w3c", "2026-03-18"),
    ];
    const summary = trainingWeekSummary(sessions, exerciseById, 3, 4, today);
    expect(summary.currentStreak).toBe(1);
  });

  it("rechnet Volumen aus den Sätzen der laufenden Woche", () => {
    const sessions = [session("a", "2026-03-16", [set({ weight: 80, reps: 8 })])];
    const summary = trainingWeekSummary(sessions, exerciseById, 3, 4, today);
    expect(summary.volumeThisWeek).toBe(640);
    expect(summary.setsThisWeek).toBe(1);
  });

  it("ignoriert Aufwärmsätze im Volumen", () => {
    const sessions = [
      session("a", "2026-03-16", [
        set({ weight: 40, reps: 8, warmup: true }),
        set({ weight: 80, reps: 8 }),
      ]),
    ];
    const summary = trainingWeekSummary(sessions, exerciseById, 3, 4, today);
    expect(summary.setsThisWeek).toBe(1);
    expect(summary.volumeThisWeek).toBe(640);
  });

  it("vergleicht das Volumen mit der Vorwoche", () => {
    const sessions = [
      session("prev", "2026-03-09", [set({ weight: 100, reps: 8 })]),
      session("curr", "2026-03-16", [set({ weight: 120, reps: 8 })]),
    ];
    const summary = trainingWeekSummary(sessions, exerciseById, 3, 4, today);
    // 960 -> 800: +20 %
    expect(summary.volumeDeltaPercent).toBe(20);
  });

  it("liefert null ohne Vorwochen-Volumen", () => {
    const sessions = [session("curr", "2026-03-16")];
    const summary = trainingWeekSummary(sessions, exerciseById, 3, 4, today);
    expect(summary.volumeDeltaPercent).toBeNull();
  });

  it("erkennt trainedToday unabhängig vom Fenster", () => {
    const sessions = [session("a", "2026-03-19")];
    const summary = trainingWeekSummary(sessions, exerciseById, 3, 4, today);
    expect(summary.trainedToday).toBe(true);
  });

  it("ohne Wochenziel wird kein Ziel je erreicht", () => {
    const sessions = [
      session("a", "2026-03-16"),
      session("b", "2026-03-17"),
      session("c", "2026-03-18"),
    ];
    const summary = trainingWeekSummary(sessions, exerciseById, null, 4, today);
    expect(summary.weeks.every((w) => !w.goalMet)).toBe(true);
    expect(summary.currentStreak).toBe(0);
  });
});
