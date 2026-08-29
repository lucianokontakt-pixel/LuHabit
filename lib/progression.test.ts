import { describe, expect, it } from "vitest";
import { exerciseHistory, summarizeProgress, deloadWeight, STAGNATION_THRESHOLD } from "@/lib/progression";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/training";

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
};

function set(overrides: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: "s",
    exerciseId: "bench",
    setIndex: 0,
    weight: 0,
    reps: 0,
    done: true,
    warmup: false,
    ...overrides,
  };
}

function session(date: string, sets: WorkoutSet[]): WorkoutSession {
  return { id: date, planId: null, dayId: null, dayName: "Push", date, durationSeconds: null, note: null, sets };
}

describe("exerciseHistory", () => {
  it("ignoriert Sätze, die nicht abgeschlossen sind", () => {
    const sessions = [session("2026-01-01", [set({ weight: 80, reps: 8, done: false })])];
    expect(exerciseHistory("bench", sessions)).toEqual([]);
  });

  it("ignoriert Sätze anderer Übungen", () => {
    const sessions = [session("2026-01-01", [set({ exerciseId: "squat", weight: 100, reps: 5 })])];
    expect(exerciseHistory("bench", sessions)).toEqual([]);
  });

  it("nimmt das schwerste Gewicht der Einheit als Arbeitsgewicht", () => {
    const sessions = [
      session("2026-01-01", [
        set({ weight: 80, reps: 8 }),
        set({ weight: 85, reps: 5 }),
        set({ weight: 85, reps: 6 }),
      ]),
    ];
    const [point] = exerciseHistory("bench", sessions);
    expect(point.topWeight).toBe(85);
    // Bei gleichem Topgewicht zählt die beste Wiederholungszahl.
    expect(point.topReps).toBe(6);
  });

  it("sortiert die Einheiten zeitlich aufsteigend", () => {
    const sessions = [
      session("2026-01-10", [set({ weight: 90, reps: 5 })]),
      session("2026-01-01", [set({ weight: 80, reps: 5 })]),
    ];
    const points = exerciseHistory("bench", sessions);
    expect(points.map((p) => p.date)).toEqual(["2026-01-01", "2026-01-10"]);
  });
});

describe("summarizeProgress", () => {
  it("erkennt Wiederholungs-basierte Übungen (0kg = Eigengewicht)", () => {
    const sessions = [
      session("2026-01-01", [set({ weight: 0, reps: 8 })]),
      session("2026-01-08", [set({ weight: 0, reps: 10 })]),
    ];
    const summary = summarizeProgress(exercise, sessions);
    expect(summary.repsBased).toBe(true);
    expect(summary.currentReps).toBe(10);
  });

  it("erkennt Stagnation nach genug Einheiten ohne Steigerung", () => {
    const dates = ["01", "02", "03", "04", "05"];
    const sessions = dates.map((d) => session(`2026-01-${d}`, [set({ weight: 80, reps: 8 })]));
    const summary = summarizeProgress(exercise, sessions);
    expect(summary.sessionsSinceGain).toBeGreaterThanOrEqual(STAGNATION_THRESHOLD);
    expect(summary.stagnating).toBe(true);
  });

  it("stagniert nicht direkt nach einer Steigerung", () => {
    const sessions = [
      session("2026-01-01", [set({ weight: 80, reps: 8 })]),
      session("2026-01-08", [set({ weight: 82.5, reps: 8 })]),
    ];
    const summary = summarizeProgress(exercise, sessions);
    expect(summary.sessionsSinceGain).toBe(0);
    expect(summary.stagnating).toBe(false);
  });

  it("gibt neutrale Werte ohne jede Historie zurück", () => {
    const summary = summarizeProgress(exercise, []);
    expect(summary.current).toBe(0);
    expect(summary.lastDate).toBeNull();
    expect(summary.changeIn(4)).toBeNull();
  });
});

describe("deloadWeight", () => {
  it("reduziert um den Deload-Faktor, gerundet auf den Gewichtssprung", () => {
    // 100 * 0.9 = 90, glatt auf 2.5er-Sprünge.
    expect(deloadWeight(100, exercise)).toBe(90);
  });

  it("reduziert bei kleinen Gewichten mindestens um einen Sprung", () => {
    // 5 * 0.9 = 4.5 -> würde auf 5 runden (kein Rückschritt) -> erzwungen auf 2.5.
    expect(deloadWeight(5, exercise)).toBe(2.5);
  });
});
