import { describe, expect, it } from "vitest";
import { collapse, localEffect, targetOf, type QueuedOp, type WriteOp } from "@/lib/write-ops";

const eintrag = (habit: string, date: string, value: number): WriteOp => ({
  kind: "entry.set",
  entry: { habit, date, value },
});

const queued = (ops: WriteOp[]): QueuedOp[] =>
  ops.map((op, i) => ({ seq: i + 1, op, createdAt: "2026-08-22 15:00:00" }));

describe("localEffect — EMOM-Ergebnisse", () => {
  const ergebnis: WriteOp = {
    kind: "emomResult.save",
    result: {
      id: "emomr-1",
      templateName: "Cindy",
      date: "2026-08-23",
      roundsPlanned: 20,
      roundsCompleted: 14,
      note: "Arme platt",
    },
  };

  it("legt ein Ergebnis unter seiner ID in emomResults ab", () => {
    const [effect] = localEffect(ergebnis);
    expect(effect).toMatchObject({
      collection: "emomResults",
      key: "emomr-1",
      action: "put",
    });
  });

  it("sortiert nach Datum, damit der Verlauf sofort richtig steht", () => {
    const [effect] = localEffect(ergebnis);
    expect(effect.action === "put" && effect.sort.startsWith("2026-08-23")).toBe(true);
  });

  it("entfernt ein gelöschtes Ergebnis aus derselben Sammlung", () => {
    expect(localEffect({ kind: "emomResult.delete", id: "emomr-1" })).toEqual([
      { collection: "emomResults", key: "emomr-1", action: "delete" },
    ]);
  });

  it("meint mit Speichern und Löschen denselben Datensatz", () => {
    // Sonst könnten beide nebeneinander in der Schlange stehen bleiben und die
    // Löschung käme vor dem Speichern beim Server an.
    expect(targetOf(ergebnis)).toBe(targetOf({ kind: "emomResult.delete", id: "emomr-1" }));
  });
});

describe("localEffect", () => {
  it("legt einen Eintrag unter habit|datum ab", () => {
    const [effect] = localEffect(eintrag("water", "2026-08-22", 750));
    expect(effect).toMatchObject({
      collection: "entries",
      key: "water|2026-08-22",
      action: "put",
      data: { habit: "water", date: "2026-08-22", value: 750 },
      sort: "2026-08-22",
    });
  });

  it("macht aus einer Löschung ein Entfernen, nicht ein Schreiben", () => {
    const effects = localEffect({ kind: "habit.delete", id: "lesen" });
    expect(effects).toContainEqual({ collection: "habits", key: "lesen", action: "delete" });
  });

  it("sortiert Übungen nach Namen, Groß- und Kleinschreibung egal", () => {
    const [effect] = localEffect({
      kind: "exercise.save",
      isNew: true,
      exercise: {
        id: "ab-wheel", name: "Ab Wheel", muscle: "core", equipment: "bodyweight",
        isCustom: true, hidden: false, increment: null, bodyweightFactor: null,
        loadFactor: null, warmup: null,
      },
    });
    expect(effect.action).toBe("put");
    if (effect.action === "put") expect(effect.sort).toBe("ab wheel");
  });

  it("schreibt bei habit.save auch das Ziel — sonst bliebe es bis zum nächsten Abgleich unsichtbar", () => {
    const effects = localEffect({
      kind: "habit.save",
      isNew: true,
      weeklyGoal: 3,
      habit: {
        id: "dehnen", label: "Dehnen", unit: "Minuten", icon: "Target",
        defaultGoal: 10, quickAdd: [5], step: 5, kind: "counter",
      },
    });
    expect(effects).toContainEqual({
      collection: "habits",
      key: "dehnen",
      action: "put",
      data: expect.objectContaining({ id: "dehnen", label: "Dehnen" }),
      sort: expect.any(String),
    });
    expect(effects).toContainEqual({
      collection: "goals",
      key: "dehnen",
      action: "put",
      data: { habit: "dehnen", target: 10, weeklyTarget: 3 },
      sort: "dehnen",
    });
  });

  it("löscht bei habit.delete auch das Ziel mit", () => {
    const effects = localEffect({ kind: "habit.delete", id: "lesen" });
    expect(effects).toContainEqual({ collection: "goals", key: "lesen", action: "delete" });
  });
});

describe("targetOf", () => {
  it("erkennt Speichern und Löschen desselben Datensatzes als dieselbe Kennung", () => {
    const speichern: WriteOp = {
      kind: "habit.save", isNew: false, weeklyGoal: null,
      habit: { id: "lesen", label: "Lesen", unit: "min", icon: "BookOpen", defaultGoal: 20, quickAdd: [5], step: 5, kind: "counter" },
    };
    expect(targetOf(speichern)).toBe(targetOf({ kind: "habit.delete", id: "lesen" }));
  });

  it("hält verschiedene Sammlungen auseinander, auch bei gleicher ID", () => {
    expect(targetOf({ kind: "habit.delete", id: "x" })).not.toBe(
      targetOf({ kind: "exercise.delete", id: "x" })
    );
  });
});

describe("collapse", () => {
  it("behält von zehn Tipps auf denselben Eintrag nur den letzten", () => {
    // Wer offline zehnmal auf "+250 ml" tippt, soll nicht zehn Anfragen senden.
    const ops = queued(
      Array.from({ length: 10 }, (_, i) => eintrag("water", "2026-08-22", (i + 1) * 250))
    );
    const übrig = collapse(ops);
    expect(übrig).toHaveLength(1);
    expect(übrig[0].op).toEqual(eintrag("water", "2026-08-22", 2500));
  });

  it("fasst nichts zusammen, was verschiedene Datensätze betrifft", () => {
    const ops = queued([
      eintrag("water", "2026-08-22", 500),
      eintrag("coffee", "2026-08-22", 2),
      eintrag("water", "2026-08-21", 1000),
    ]);
    expect(collapse(ops)).toHaveLength(3);
  });

  it("lässt eine Löschung gewinnen, die nach einer Änderung kam", () => {
    const speichern: WriteOp = {
      kind: "emom.save", isNew: true,
      template: { id: "emom-1", name: "Test", prepareSeconds: 10, rounds: 10, steps: [], restSeconds: 0, position: 0 },
    };
    const ops = queued([speichern, { kind: "emom.delete", id: "emom-1" }]);
    const übrig = collapse(ops);
    expect(übrig).toHaveLength(1);
    expect(übrig[0].op.kind).toBe("emom.delete");
  });

  it("lässt eine Änderung gewinnen, die nach einer Löschung kam", () => {
    // Löschen und gleich neu anlegen — die Neuanlage darf nicht verschwinden.
    const speichern: WriteOp = {
      kind: "emom.save", isNew: true,
      template: { id: "emom-1", name: "Neu", prepareSeconds: 10, rounds: 10, steps: [], restSeconds: 0, position: 0 },
    };
    const ops = queued([{ kind: "emom.delete", id: "emom-1" }, speichern]);
    const übrig = collapse(ops);
    expect(übrig).toHaveLength(1);
    expect(übrig[0].op.kind).toBe("emom.save");
  });

  it("dampft mehrfaches Nachbessern eines Ergebnisses auf den letzten Stand ein", () => {
    // Wer die Rundenzahl offline zweimal korrigiert, soll nicht zwei
    // Schreibvorgänge senden — der letzte beschreibt den ganzen Zustand.
    const ergebnis = (roundsCompleted: number): WriteOp => ({
      kind: "emomResult.save",
      result: {
        id: "emomr-1",
        templateName: "Cindy",
        date: "2026-08-23",
        roundsPlanned: 20,
        roundsCompleted,
        note: null,
      },
    });
    const übrig = collapse(queued([ergebnis(12), ergebnis(14)]));
    expect(übrig).toHaveLength(1);
    expect((übrig[0].op as { result: { roundsCompleted: number } }).result.roundsCompleted).toBe(14);
  });

  it("behält die Reihenfolge nach dem letzten Auftreten", () => {
    // Reihenfolge zählt: die Löschung eines Habits muss beim Server nach der
    // Änderung des anderen ankommen, sonst stimmt der Endzustand nicht.
    const ops = queued([
      eintrag("water", "2026-08-22", 100),
      eintrag("coffee", "2026-08-22", 1),
      eintrag("water", "2026-08-22", 900),
    ]);
    const übrig = collapse(ops);
    expect(übrig.map((q) => q.seq)).toEqual([2, 3]);
  });

  it("kommt mit einer leeren Schlange klar", () => {
    expect(collapse([])).toEqual([]);
  });
});

describe("localEffect — plan.save daysChanged betrifft nur die Netzwerkseite", () => {
  it("ändert daran nichts am lokalen Effekt — der schreibt immer den vollen Plan", () => {
    const plan: import("@/lib/training").WorkoutPlan = {
      id: "plan-1", name: "PPL", isActive: true, position: 0, weeklyTarget: null, days: [],
    };
    const mit = localEffect({ kind: "plan.save", plan, isNew: false, daysChanged: true });
    const ohne = localEffect({ kind: "plan.save", plan, isNew: false, daysChanged: false });
    expect(mit).toEqual(ohne);
  });
});
