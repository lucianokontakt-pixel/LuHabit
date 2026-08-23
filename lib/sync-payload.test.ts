import { describe, expect, it } from "vitest";
import { entryKey, readSyncPayload } from "@/lib/sync-payload";

/** Eine Antwort, wie /api/sync sie liefert — nur die Teile, die der Test braucht. */
function payload(overrides: Record<string, unknown> = {}) {
  return { now: "2026-08-22 14:00:00", full: false, ...overrides };
}

describe("readSyncPayload — Grundlagen", () => {
  it("übernimmt den Cursor, auf dem der nächste Abgleich aufsetzt", () => {
    expect(readSyncPayload(payload()).cursor).toBe("2026-08-22 14:00:00");
  });

  it("überlebt eine leere oder unsinnige Antwort, statt zu werfen", () => {
    expect(readSyncPayload(null).entries).toEqual([]);
    expect(readSyncPayload({}).plans).toEqual([]);
    expect(readSyncPayload({ entries: "kaputt" }).entries).toEqual([]);
  });
});

describe("readSyncPayload — Grabsteine", () => {
  it("trennt gelöschte von lebenden Datensätzen", () => {
    const snap = readSyncPayload(
      payload({
        entries: [
          { habit: "water", date: "2026-08-22", value: 500, deleted_at: null },
          { habit: "coffee", date: "2026-08-22", value: 2, deleted_at: "2026-08-22 13:00:00" },
        ],
      })
    );
    expect(snap.entries).toEqual([{ habit: "water", date: "2026-08-22", value: 500 }]);
    expect(snap.removed.entries).toEqual([entryKey("coffee", "2026-08-22")]);
  });

  it("entfernt gelöschte Habits, Übungen, Pläne, Einheiten und Vorlagen unter ihrer ID", () => {
    const tomb = { deleted_at: "2026-08-22 13:00:00" };
    const snap = readSyncPayload(
      payload({
        habits: [{ id: "lesen", ...tomb }],
        exercises: [{ id: "bankdruecken-lh", ...tomb }],
        plans: [{ id: "plan-alt", ...tomb }],
        sessions: [{ id: "ws-alt", ...tomb }],
        emom: [{ id: "emom-alt", ...tomb }],
        goals: [{ habit: "lesen", ...tomb }],
      })
    );
    expect(snap.removed).toEqual({
      entries: [],
      goals: ["lesen"],
      habits: ["lesen"],
      exercises: ["bankdruecken-lh"],
      plans: ["plan-alt"],
      sessions: ["ws-alt"],
      emom: ["emom-alt"],
      emomResults: [],
    });
    expect(snap.habits).toEqual([]);
    expect(snap.plans).toEqual([]);
  });
});

describe("readSyncPayload — Pläne als Dokument", () => {
  const raw = payload({
    plans: [{ id: "plan-ppl", name: "PPL", is_active: 1, position: 0, weekly_target: 3, deleted_at: null }],
    planDays: [
      { id: "day-pull", plan_id: "plan-ppl", name: "Pull", position: 1, weekday: null },
      { id: "day-push", plan_id: "plan-ppl", name: "Push", position: 0, weekday: null },
    ],
    planExercises: [
      { id: "pe-2", day_id: "day-push", exercise_id: "seitheben-kh", position: 1, sets: 3, rep_min: 10, rep_max: 15, rest_seconds: 75, increment: null, start_weight: null },
      { id: "pe-1", day_id: "day-push", exercise_id: "bankdruecken-lh", position: 0, sets: 3, rep_min: 8, rep_max: 12, rest_seconds: 150, increment: null, start_weight: null },
      { id: "pe-3", day_id: "day-pull", exercise_id: "klimmzuege", position: 0, sets: 3, rep_min: 6, rep_max: 12, rest_seconds: 150, increment: null, start_weight: null },
    ],
  });

  it("hängt Tage an ihren Plan und Übungen an ihren Tag", () => {
    const [plan] = readSyncPayload(raw).plans;
    expect(plan.days.map((d) => d.name)).toEqual(["Push", "Pull"]);
    expect(plan.days[0].exercises.map((e) => e.exerciseId)).toEqual([
      "bankdruecken-lh",
      "seitheben-kh",
    ]);
    expect(plan.days[1].exercises.map((e) => e.exerciseId)).toEqual(["klimmzuege"]);
  });

  it("sortiert nach position, nicht nach Reihenfolge der Antwort", () => {
    const [plan] = readSyncPayload(raw).plans;
    expect(plan.days.map((d) => d.position)).toEqual([0, 1]);
    expect(plan.days[0].exercises.map((e) => e.position)).toEqual([0, 1]);
  });

  it("ordnet Kindzeilen keinem fremden Plan zu", () => {
    const snap = readSyncPayload(
      payload({
        plans: [
          { id: "plan-a", name: "A", is_active: 1, position: 0, weekly_target: null, deleted_at: null },
          { id: "plan-b", name: "B", is_active: 0, position: 1, weekly_target: null, deleted_at: null },
        ],
        planDays: [{ id: "day-a", plan_id: "plan-a", name: "Tag", position: 0, weekday: null }],
      })
    );
    expect(snap.plans[0].days).toHaveLength(1);
    expect(snap.plans[1].days).toEqual([]);
  });

  it("liefert einen Plan ohne Tage als leeren Plan statt zu werfen", () => {
    const snap = readSyncPayload(
      payload({
        plans: [{ id: "leer", name: "Leer", is_active: 0, position: 0, weekly_target: null, deleted_at: null }],
      })
    );
    expect(snap.plans[0].days).toEqual([]);
  });
});

describe("readSyncPayload — Einheiten als Dokument", () => {
  it("hängt Sätze an ihre Einheit und sortiert sie nach set_index", () => {
    const snap = readSyncPayload(
      payload({
        sessions: [
          { id: "ws-1", plan_id: "plan-ppl", day_id: "day-push", day_name: "Push", date: "2026-08-22", duration_seconds: 3600, note: null, deleted_at: null },
        ],
        sets: [
          { id: "s2", session_id: "ws-1", exercise_id: "bankdruecken-lh", set_index: 1, weight: 42.5, reps: 8, done: 1, warmup: 0 },
          { id: "s1", session_id: "ws-1", exercise_id: "bankdruecken-lh", set_index: 0, weight: 20, reps: 10, done: 1, warmup: 1 },
          { id: "fremd", session_id: "ws-anders", exercise_id: "klimmzuege", set_index: 0, weight: 0, reps: 5, done: 1, warmup: 0 },
        ],
      })
    );
    const [session] = snap.sessions;
    expect(session.sets.map((s) => s.setIndex)).toEqual([0, 1]);
    expect(session.sets[0].warmup).toBe(true);
    expect(session.sets[1].warmup).toBe(false);
    expect(session.sets.some((s) => s.id === "fremd")).toBe(false);
  });

  it("übersetzt 0 und 1 zu echten Wahrheitswerten", () => {
    const snap = readSyncPayload(
      payload({
        sessions: [{ id: "ws-1", plan_id: null, day_id: null, day_name: "X", date: "2026-08-22", duration_seconds: null, note: null, deleted_at: null }],
        sets: [{ id: "s1", session_id: "ws-1", exercise_id: "e", set_index: 0, weight: 0, reps: 1, done: 0, warmup: 1 }],
      })
    );
    expect(snap.sessions[0].sets[0].done).toBe(false);
    expect(snap.sessions[0].planId).toBeNull();
    expect(snap.sessions[0].durationSeconds).toBeNull();
  });
});

describe("readSyncPayload — Sortierschlüssel bilden die Reihenfolge des Servers nach", () => {
  it("trennt zwei Einheiten am selben Tag nach ihrer Startzeit", () => {
    // Genau hier hängt die Progression dran: lastSetsFor nimmt die erste
    // Einheit mit dieser Übung, absteigend sortiert. Ohne die Startzeit wäre
    // bei gleichem Datum offen, welche das ist.
    const snap = readSyncPayload(
      payload({
        sessions: [
          { id: "frueh", plan_id: null, day_id: null, day_name: "A", date: "2026-08-22", duration_seconds: null, note: null, started_at: "2026-08-22 08:00:00", deleted_at: null },
          { id: "spaet", plan_id: null, day_id: null, day_name: "B", date: "2026-08-22", duration_seconds: null, note: null, started_at: "2026-08-22 18:00:00", deleted_at: null },
        ],
      })
    );
    const keys = snap.sortKeys.sessions;
    expect(keys.spaet > keys.frueh).toBe(true);
  });

  it("sortiert Übungen wie die Route: nach Namen, Groß- und Kleinschreibung egal", () => {
    const snap = readSyncPayload(
      payload({
        exercises: [
          { id: "b", name: "Bankdrücken", muscle: "chest", equipment: "barbell", is_custom: 0, hidden: 0, increment: null, bodyweight_factor: null, load_factor: null, warmup: null, deleted_at: null },
          { id: "a", name: "ab-wheel", muscle: "core", equipment: "bodyweight", is_custom: 0, hidden: 0, increment: null, bodyweight_factor: null, load_factor: null, warmup: null, deleted_at: null },
        ],
      })
    );
    expect(snap.sortKeys.exercises.a < snap.sortKeys.exercises.b).toBe(true);
  });

  it("sortiert Pläne nach position, auch über die Zehnerstelle hinweg", () => {
    // Als Text verglichen käme "10" vor "9" — deshalb aufgefüllt.
    const plan = (id: string, position: number) => ({
      id, name: id, is_active: 0, position, weekly_target: null, created_at: "2026-01-01 00:00:00", deleted_at: null,
    });
    const snap = readSyncPayload(payload({ plans: [plan("neun", 9), plan("zehn", 10)] }));
    expect(snap.sortKeys.plans.neun < snap.sortKeys.plans.zehn).toBe(true);
  });

  it("vergibt für gelöschte Datensätze keinen Sortierschlüssel", () => {
    const snap = readSyncPayload(
      payload({ habits: [{ id: "weg", created_at: "2026-01-01 00:00:00", deleted_at: "2026-08-22 10:00:00" }] })
    );
    expect(snap.sortKeys.habits).toEqual({});
    expect(snap.removed.habits).toEqual(["weg"]);
  });
});

describe("readSyncPayload — kaputte Daten dürfen den Abgleich nicht kippen", () => {
  it("rettet ein Habit mit zerschossenem quick_add mit Standardwerten", () => {
    const snap = readSyncPayload(
      payload({
        habits: [
          { id: "wasser", label: "Wasser", unit: "ml", icon: "Droplets", default_goal: 2000, quick_add: "{kein json", step: 50, kind: "counter", deleted_at: null },
          { id: "lesen", label: "Lesen", unit: "min", icon: "BookOpen", default_goal: 20, quick_add: "[5,10]", step: 5, kind: "counter", deleted_at: null },
        ],
      })
    );
    expect(snap.habits).toHaveLength(2);
    expect(snap.habits[0].quickAdd).toEqual([1]);
    expect(snap.habits[1].quickAdd).toEqual([5, 10]);
  });

  it("rettet eine EMOM-Vorlage mit unlesbaren Schritten", () => {
    const snap = readSyncPayload(
      payload({
        emom: [
          { id: "emom-1", name: "Kaputt", prepare_seconds: 10, rounds: 10, steps: "{kein json", rest_seconds: 0, position: 0, deleted_at: null },
          { id: "emom-2", name: "Heil", prepare_seconds: 10, rounds: 8, steps: '[{"seconds":60,"reps":12,"label":"Burpees"}]', rest_seconds: 0, position: 1, deleted_at: null },
        ],
      })
    );
    expect(snap.emom).toHaveLength(2);
    expect(snap.emom[0].steps).toEqual([]);
    expect(snap.emom[1].steps).toEqual([{ seconds: 60, reps: 12, label: "Burpees" }]);
  });

  it("macht aus einem fehlenden Zahlenwert keine NaN", () => {
    const snap = readSyncPayload(
      payload({
        entries: [{ habit: "water", date: "2026-08-22", value: "keine zahl", deleted_at: null }],
      })
    );
    expect(snap.entries[0].value).toBe(0);
  });
});

describe("readSyncPayload — EMOM-Ergebnisse", () => {
  const zeile = (overrides: Record<string, unknown> = {}) => ({
    id: "emomr-1",
    template_name: "Tom Holland Challenge",
    date: "2026-08-23",
    rounds_planned: 20,
    rounds_completed: 14,
    note: "Arme platt",
    created_at: "2026-08-23 12:00:00",
    deleted_at: null,
    ...overrides,
  });

  it("übersetzt eine Zeile in das, was die App benutzt", () => {
    const snap = readSyncPayload(payload({ emomResults: [zeile()] }));
    expect(snap.emomResults).toEqual([
      {
        id: "emomr-1",
        templateName: "Tom Holland Challenge",
        date: "2026-08-23",
        roundsPlanned: 20,
        roundsCompleted: 14,
        note: "Arme platt",
      },
    ]);
  });

  it("hält eine fehlende Notiz als null fest, nicht als leeren Text", () => {
    const snap = readSyncPayload(payload({ emomResults: [zeile({ note: null })] }));
    expect(snap.emomResults[0].note).toBeNull();
  });

  it("entfernt gelöschte Ergebnisse unter ihrer ID", () => {
    const snap = readSyncPayload(
      payload({ emomResults: [zeile({ deleted_at: "2026-08-23 13:00:00" })] })
    );
    expect(snap.emomResults).toEqual([]);
    expect(snap.removed.emomResults).toEqual(["emomr-1"]);
  });

  it("sortiert nach Datum und Anlegezeit — jüngstes zuerst gelesen", () => {
    // Die Liste wird absteigend gelesen; ohne die Anlegezeit wäre bei zwei
    // Durchgängen am selben Tag offen, welcher der spätere war.
    const snap = readSyncPayload(
      payload({
        emomResults: [
          zeile({ id: "a", date: "2026-08-23", created_at: "2026-08-23 08:00:00" }),
          zeile({ id: "b", date: "2026-08-23", created_at: "2026-08-23 19:00:00" }),
        ],
      })
    );
    expect(snap.sortKeys.emomResults.a < snap.sortKeys.emomResults.b).toBe(true);
  });

  it("überlebt eine Zeile ohne Namen und ohne Zahlen", () => {
    const snap = readSyncPayload(
      payload({
        emomResults: [
          zeile({ template_name: undefined, rounds_planned: null, rounds_completed: "x" }),
        ],
      })
    );
    expect(snap.emomResults[0].templateName).toBe("EMOM");
    expect(snap.emomResults[0].roundsPlanned).toBe(0);
    expect(snap.emomResults[0].roundsCompleted).toBe(0);
  });
});
