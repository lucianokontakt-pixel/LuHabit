import { describe, expect, it } from "vitest";
import { collapse, localEffect, targetOf, type QueuedOp, type WriteOp } from "@/lib/write-ops";
import type { WorkoutPlan, WorkoutSession } from "@/lib/training";

const messwert = (habit: string, date: string, value: number): WriteOp => ({
  kind: "entry.set",
  entry: { habit, date, value },
});

const plan = (id: string, name: string): WorkoutPlan => ({
  id,
  name,
  isActive: true,
  position: 0,
  weeklyTarget: null,
  days: [],
});

const einheit = (id: string, date: string): WorkoutSession => ({
  id,
  planId: "plan-1",
  dayId: "day-1",
  dayName: "Upper",
  date,
  durationSeconds: 3600,
  note: null,
  sets: [],
});

const queued = (ops: WriteOp[]): QueuedOp[] =>
  ops.map((op, i) => ({ seq: i + 1, op, createdAt: "2026-08-22 15:00:00" }));

describe("localEffect", () => {
  it("legt einen Körperwert unter messwert|datum ab", () => {
    const [effect] = localEffect(messwert("weight", "2026-08-22", 82.4));
    expect(effect).toMatchObject({
      collection: "entries",
      key: "weight|2026-08-22",
      action: "put",
      data: { habit: "weight", date: "2026-08-22", value: 82.4 },
      sort: "2026-08-22",
    });
  });

  it("macht aus einer Löschung ein Entfernen, nicht ein Schreiben", () => {
    expect(localEffect({ kind: "session.delete", id: "ws-1" })).toEqual([
      { collection: "sessions", key: "ws-1", action: "delete" },
    ]);
  });

  it("sortiert Übungen nach Namen, Groß- und Kleinschreibung egal", () => {
    const [effect] = localEffect({
      kind: "exercise.save",
      isNew: true,
      exercise: {
        id: "ab-wheel", name: "Ab Wheel", muscle: "core", equipment: "bodyweight",
        isCustom: true, hidden: false, favorite: false, increment: null, bodyweightFactor: null,
        loadFactor: null, warmup: null,
      },
    });
    expect(effect.action).toBe("put");
    if (effect.action === "put") expect(effect.sort).toBe("ab wheel");
  });

  it("sortiert Einheiten nach Datum, damit der Verlauf sofort richtig steht", () => {
    const [effect] = localEffect({
      kind: "session.save",
      isNew: true,
      session: einheit("ws-1", "2026-08-23"),
    });
    expect(effect.action === "put" && effect.sort.startsWith("2026-08-23")).toBe(true);
  });
});

describe("targetOf", () => {
  it("erkennt Speichern und Löschen desselben Datensatzes als dieselbe Kennung", () => {
    const speichern: WriteOp = { kind: "plan.save", plan: plan("plan-1", "PPL"), isNew: false, daysChanged: false };
    expect(targetOf(speichern)).toBe(targetOf({ kind: "plan.delete", id: "plan-1" }));
  });

  it("hält verschiedene Sammlungen auseinander, auch bei gleicher ID", () => {
    expect(targetOf({ kind: "plan.delete", id: "x" })).not.toBe(
      targetOf({ kind: "exercise.delete", id: "x" })
    );
  });
});

describe("collapse", () => {
  it("behält von zehn Korrekturen an einem Wert nur die letzte", () => {
    // Wer offline zehnmal am Gewicht dreht, soll nicht zehn Anfragen senden.
    const ops = queued(
      Array.from({ length: 10 }, (_, i) => messwert("weight", "2026-08-22", 80 + i * 0.1))
    );
    const übrig = collapse(ops);
    expect(übrig).toHaveLength(1);
    expect(übrig[0].op).toEqual(messwert("weight", "2026-08-22", 80.9));
  });

  it("fasst nichts zusammen, was verschiedene Datensätze betrifft", () => {
    const ops = queued([
      messwert("weight", "2026-08-22", 82),
      messwert("bodyfat", "2026-08-22", 18),
      messwert("weight", "2026-08-21", 82.4),
    ]);
    expect(collapse(ops)).toHaveLength(3);
  });

  it("lässt eine Löschung gewinnen, die nach einer Änderung kam", () => {
    const speichern: WriteOp = { kind: "plan.save", plan: plan("plan-1", "PPL"), isNew: true, daysChanged: true };
    const übrig = collapse(queued([speichern, { kind: "plan.delete", id: "plan-1" }]));
    expect(übrig).toHaveLength(1);
    expect(übrig[0].op.kind).toBe("plan.delete");
  });

  it("lässt eine Änderung gewinnen, die nach einer Löschung kam", () => {
    // Löschen und gleich neu anlegen — die Neuanlage darf nicht verschwinden.
    const speichern: WriteOp = { kind: "plan.save", plan: plan("plan-1", "Neu"), isNew: true, daysChanged: true };
    const übrig = collapse(queued([{ kind: "plan.delete", id: "plan-1" }, speichern]));
    expect(übrig).toHaveLength(1);
    expect(übrig[0].op.kind).toBe("plan.save");
  });

  it("dampft mehrfaches Nachbessern einer Einheit auf den letzten Stand ein", () => {
    // Wer eine Einheit offline zweimal korrigiert, soll nicht zwei
    // Schreibvorgänge senden — der letzte beschreibt den ganzen Zustand.
    const stand = (date: string): WriteOp => ({
      kind: "session.save",
      isNew: false,
      session: einheit("ws-1", date),
    });
    const übrig = collapse(queued([stand("2026-08-22"), stand("2026-08-23")]));
    expect(übrig).toHaveLength(1);
    expect((übrig[0].op as { session: WorkoutSession }).session.date).toBe("2026-08-23");
  });

  it("behält die Reihenfolge nach dem letzten Auftreten", () => {
    // Reihenfolge zählt: was zuletzt geändert wurde, muss beim Server auch
    // zuletzt ankommen, sonst stimmt der Endzustand nicht.
    const ops = queued([
      messwert("weight", "2026-08-22", 82),
      messwert("bodyfat", "2026-08-22", 18),
      messwert("weight", "2026-08-22", 82.5),
    ]);
    expect(collapse(ops).map((q) => q.seq)).toEqual([2, 3]);
  });

  it("macht aus Löschen und Zurückholen einer Einheit nur das Wiederanlegen", () => {
    // Das trägt „Rückgängig" nach dem Löschen: restoreSession reiht dieselbe
    // Einheit mit ihrer alten Kennung wieder ein. Beide Operationen zeigen auf
    // denselben Datensatz, also bleibt nur die zweite — der Server sieht die
    // Löschung nie, und die Zeile bleibt, wo sie war.
    const zurueck: WriteOp = {
      kind: "session.save",
      isNew: true,
      session: einheit("ws-1", "2026-08-26"),
    };
    const übrig = collapse(queued([{ kind: "session.delete", id: "ws-1" }, zurueck]));
    expect(übrig).toHaveLength(1);
    expect(übrig[0].op.kind).toBe("session.save");
    expect((übrig[0].op as { session: WorkoutSession }).session.id).toBe("ws-1");
  });

  it("kommt mit einer leeren Schlange klar", () => {
    expect(collapse([])).toEqual([]);
  });
});

describe("localEffect — plan.save daysChanged betrifft nur die Netzwerkseite", () => {
  it("ändert daran nichts am lokalen Effekt — der schreibt immer den vollen Plan", () => {
    const p = plan("plan-1", "PPL");
    const mit = localEffect({ kind: "plan.save", plan: p, isNew: false, daysChanged: true });
    const ohne = localEffect({ kind: "plan.save", plan: p, isNew: false, daysChanged: false });
    expect(mit).toEqual(ohne);
  });
});
