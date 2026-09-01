import { describe, expect, it } from "vitest";
import { summarizeSession } from "@/lib/session-stats";
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
};

const pullup: Exercise = {
  ...bench,
  id: "pullup",
  name: "Klimmzüge",
  muscle: "back",
  equipment: "bodyweight",
};

const exerciseById = { bench, pullup };

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

function session(
  id: string,
  date: string,
  sets: WorkoutSet[],
  overrides: Partial<WorkoutSession> = {}
): WorkoutSession {
  return {
    id,
    planId: null,
    dayId: "push",
    dayName: "Push",
    date,
    durationSeconds: null,
    note: null,
    sets,
    ...overrides,
  };
}

describe("summarizeSession", () => {
  it("zählt nur abgehakte Sätze", () => {
    const current = session("a", "2026-01-08", [
      set({ weight: 80, reps: 8 }),
      set({ weight: 80, reps: 8, done: false }),
    ]);
    const summary = summarizeSession(current, [current], exerciseById);
    expect(summary.sets).toBe(1);
    expect(summary.reps).toBe(8);
    expect(summary.volume).toBe(640);
  });

  it("lässt Aufwärmsätze aus Zählung, Volumen und Rekorden heraus", () => {
    const older = session("a", "2026-01-01", [set({ weight: 80, reps: 8 })]);
    const current = session("b", "2026-01-08", [
      // Schwerer als der Arbeitssatz, aber nur zum Warmwerden — das darf weder
      // als Bestgewicht durchgehen noch das Volumen aufblähen.
      set({ setIndex: 0, weight: 100, reps: 3, warmup: true }),
      set({ setIndex: 1, weight: 80, reps: 10 }),
    ]);
    const summary = summarizeSession(current, [current, older], exerciseById);
    expect(summary.sets).toBe(1);
    expect(summary.volume).toBe(800);
    expect(summary.records.map((r) => r.kind)).not.toContain("weight");
  });

  it("vergibt beim ersten Mal keine Bestleistung", () => {
    const current = session("a", "2026-01-08", [set({ weight: 80, reps: 8 })]);
    const summary = summarizeSession(current, [current], exerciseById);
    expect(summary.records).toEqual([]);
    expect(summary.exercises[0].previous).toBeNull();
  });

  it("erkennt ein neues Bestgewicht gegenüber früheren Einheiten", () => {
    const older = session("a", "2026-01-01", [set({ weight: 80, reps: 8 })]);
    const current = session("b", "2026-01-08", [set({ weight: 85, reps: 8 })]);
    const summary = summarizeSession(current, [current, older], exerciseById);
    expect(summary.records.map((r) => r.kind)).toContain("weight");
    expect(summary.exercises[0].previous?.topWeight).toBe(80);
  });

  it("zählt bei gleichem Gewicht mehr Wiederholungen als Rekord", () => {
    const older = session("a", "2026-01-01", [set({ weight: 80, reps: 8 })]);
    const current = session("b", "2026-01-08", [set({ weight: 80, reps: 10 })]);
    const summary = summarizeSession(current, [current, older], exerciseById);
    expect(summary.records.map((r) => r.kind)).toContain("reps");
  });

  it("wertet weniger Gewicht nicht als Rekord", () => {
    const older = session("a", "2026-01-01", [set({ weight: 90, reps: 8 })]);
    const current = session("b", "2026-01-08", [set({ weight: 80, reps: 12 })]);
    const summary = summarizeSession(current, [current, older], exerciseById);
    expect(summary.records.map((r) => r.kind)).not.toContain("weight");
    expect(summary.records.map((r) => r.kind)).not.toContain("reps");
  });

  it("nennt je Übung nur die stärkste Auszeichnung", () => {
    const older = session("a", "2026-01-01", [set({ weight: 80, reps: 8 })]);
    // Mehr Gewicht, mehr geschätztes Maximum und mehr Volumen zugleich.
    const current = session("b", "2026-01-08", [
      set({ weight: 90, reps: 8 }),
      set({ weight: 90, reps: 8, setIndex: 1 }),
    ]);
    const summary = summarizeSession(current, [current, older], exerciseById);
    expect(summary.records).toHaveLength(1);
    expect(summary.records[0].kind).toBe("weight");
  });

  it("summiert Sätze je Muskelgruppe", () => {
    const current = session("a", "2026-01-08", [
      set({ weight: 80, reps: 8 }),
      set({ weight: 80, reps: 8, setIndex: 1 }),
      set({ exerciseId: "pullup", reps: 10, setIndex: 2 }),
    ]);
    const summary = summarizeSession(current, [current], exerciseById);
    expect(summary.setsByMuscle).toEqual({ chest: 2, back: 1 });
  });

  it("rechnet die Dichte nur mit gemessener Dauer", () => {
    const withTime = session("a", "2026-01-08", [set({ weight: 100, reps: 10 })], {
      durationSeconds: 3600,
    });
    expect(summarizeSession(withTime, [withTime], exerciseById).density).toBe(
      // 1000 kg in 60 Minuten
      1000 / 60
    );

    const nachgetragen = session("b", "2026-01-08", [set({ weight: 100, reps: 10 })]);
    expect(summarizeSession(nachgetragen, [nachgetragen], exerciseById).density).toBeNull();
  });

  it("vergleicht das Volumen mit der letzten Einheit desselben Tages", () => {
    const older = session("a", "2026-01-01", [set({ weight: 80, reps: 10 })]);
    const otherDay = session("b", "2026-01-05", [set({ weight: 200, reps: 10 })], {
      dayId: "legs",
      dayName: "Legs",
    });
    const current = session("c", "2026-01-08", [set({ weight: 90, reps: 10 })]);
    const summary = summarizeSession(current, [current, otherDay, older], exerciseById);
    expect(summary.previousSession?.id).toBe("a");
    expect(summary.volumeDelta).toBe(900 - 800);
  });

  it("ignoriert Einheiten, die zeitlich nach dieser liegen", () => {
    const current = session("a", "2026-01-01", [set({ weight: 80, reps: 8 })]);
    const later = session("b", "2026-02-01", [set({ weight: 120, reps: 8 })]);
    const summary = summarizeSession(current, [later, current], exerciseById);
    expect(summary.exercises[0].previous).toBeNull();
    expect(summary.records).toEqual([]);
  });
});
