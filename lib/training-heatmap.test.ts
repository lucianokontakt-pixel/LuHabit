import { describe, expect, it } from "vitest";
import { heatmapDays, levelMarks, levelOf } from "@/lib/training-heatmap";
import type { WorkoutSession, WorkoutSet } from "@/lib/training";

function set(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "s",
    exerciseId: "bench",
    setIndex: 0,
    weight: 60,
    reps: 8,
    done: true,
    warmup: false,
    ...overrides,
  };
}

function session(date: string, sets: WorkoutSet[], id = date): WorkoutSession {
  return {
    id,
    planId: "p",
    dayId: "d",
    dayName: "Upper",
    date,
    durationSeconds: 3600,
    note: null,
    sets,
  };
}

describe("levelMarks", () => {
  it("legt die Schwellen auf die Viertel der Trainingstage", () => {
    expect(levelMarks([0, 0, 4, 8, 12, 16])).toEqual([4, 8, 12]);
  });

  it("lässt trainingsfreie Tage außen vor", () => {
    expect(levelMarks([0, 0, 0])).toEqual([]);
  });

  it("teilt unter vier Trainingstagen gar nicht erst ein", () => {
    expect(levelMarks([0, 5, 20, 0])).toEqual([]);
  });

  it("legt den stärksten Tag über die oberste Schwelle", () => {
    const counts = [2, 4, 6, 8, 10, 12, 14, 40];
    const marks = levelMarks(counts);
    expect(levelOf(40, marks)).toBe(4);
    expect(levelOf(2, marks)).toBe(1);
  });
});

describe("levelOf", () => {
  const marks = [4, 8, 12];

  it("gibt einem Tag ohne Training die Stufe 0", () => {
    expect(levelOf(0, marks)).toBe(0);
  });

  it("verteilt die Trainingstage auf vier Stufen", () => {
    expect(levelOf(3, marks)).toBe(1);
    expect(levelOf(4, marks)).toBe(1);
    expect(levelOf(8, marks)).toBe(2);
    expect(levelOf(12, marks)).toBe(3);
    expect(levelOf(30, marks)).toBe(4);
  });

  it("färbt ohne Schwellen jeden Trainingstag gleich", () => {
    expect(levelOf(1, [])).toBe(4);
  });
});

describe("heatmapDays", () => {
  const today = new Date("2026-08-27T12:00:00");

  it("beginnt an einem Montag und endet heute", () => {
    const days = heatmapDays([], 30, today);
    expect(new Date(`${days[0].date}T12:00:00`).getDay()).toBe(1);
    expect(days[days.length - 1].date).toBe("2026-08-27");
    // Volle Wochen: die Länge ist immer ein Vielfaches von sieben plus die
    // angebrochene laufende Woche.
    expect(days.length % 7).toBe(new Date("2026-08-27T12:00:00").getDay() === 0 ? 0 : 4);
  });

  it("zählt die Arbeitssätze eines Tages, Aufwärmsätze nicht", () => {
    const days = heatmapDays(
      [session("2026-08-26", [set(), set(), set({ warmup: true }), set({ done: false })])],
      30,
      today
    );
    const day = days.find((d) => d.date === "2026-08-26");
    expect(day?.sets).toBe(2);
  });

  it("addiert zwei Einheiten am selben Tag und merkt sich beide", () => {
    const days = heatmapDays(
      [
        session("2026-08-26", [set(), set()], "a"),
        session("2026-08-26", [set()], "b"),
      ],
      30,
      today
    );
    const day = days.find((d) => d.date === "2026-08-26");
    expect(day?.sets).toBe(3);
    expect(day?.sessionIds).toEqual(["a", "b"]);
  });

  it("lässt Einheiten außerhalb des Zeitraums weg", () => {
    const days = heatmapDays([session("2024-01-01", [set()])], 30, today);
    expect(days.every((d) => d.sets === 0)).toBe(true);
  });
});
