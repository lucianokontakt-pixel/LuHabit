import { describe, expect, it } from "vitest";
import { entwurfStand } from "./session-draft";

const entwurf = (sets: Record<string, { done: boolean; warmup: boolean }[]>) =>
  JSON.stringify({ dayId: "tag-1", startedAt: 0, sets });

describe("entwurfStand", () => {
  it("zählt abgehakte Arbeitssätze", () => {
    expect(
      entwurfStand(
        entwurf({
          a: [
            { done: true, warmup: false },
            { done: false, warmup: false },
          ],
          b: [{ done: true, warmup: false }],
        })
      )
    ).toEqual({ dayId: "tag-1", erledigt: 2, gesamt: 3 });
  });

  it("lässt Aufwärmsätze außen vor — wie die Einheit selbst", () => {
    expect(
      entwurfStand(
        entwurf({
          a: [
            { done: true, warmup: true },
            { done: true, warmup: false },
          ],
        })
      )
    ).toEqual({ dayId: "tag-1", erledigt: 1, gesamt: 1 });
  });

  it("kennt den frisch geöffneten Entwurf ohne einen einzigen Haken", () => {
    expect(entwurfStand(entwurf({ a: [{ done: false, warmup: false }] }))).toEqual({
      dayId: "tag-1",
      erledigt: 0,
      gesamt: 1,
    });
  });

  // Ein kaputter oder fremder Speicher darf die Startseite nicht mitreißen —
  // "nichts offen" ist der harmlose Ausgang.
  it.each([
    ["nichts gespeichert", null],
    ["kein JSON", "{kaputt"],
    ["ohne dayId", JSON.stringify({ sets: {} })],
    ["leere dayId", JSON.stringify({ dayId: "", sets: {} })],
  ])("gibt bei %s null zurück", (_fall, raw) => {
    expect(entwurfStand(raw)).toBeNull();
  });

  it("überlebt einen Entwurf ohne sets", () => {
    expect(entwurfStand(JSON.stringify({ dayId: "tag-1" }))).toEqual({
      dayId: "tag-1",
      erledigt: 0,
      gesamt: 0,
    });
  });
});
