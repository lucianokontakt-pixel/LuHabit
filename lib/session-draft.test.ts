import { describe, expect, it } from "vitest";
import { entwurfStand, uebungenDerEinheit } from "./session-draft";

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

describe("uebungenDerEinheit", () => {
  const plan = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const ids = (liste: { id: string }[]) => liste.map((x) => x.id);

  it("lässt einen unberührten Plan unberührt", () => {
    expect(ids(uebungenDerEinheit(plan, {}, []))).toEqual(["a", "b", "c"]);
  });

  it("hängt Dazugekommenes hinten an", () => {
    expect(ids(uebungenDerEinheit(plan, {}, [{ id: "extra" }]))).toEqual([
      "a",
      "b",
      "c",
      "extra",
    ]);
  });

  it("lässt eine ausgelassene Übung weg", () => {
    expect(ids(uebungenDerEinheit(plan, { b: null }, []))).toEqual(["a", "c"]);
  });

  it("setzt den Ersatz an die Stelle der getauschten Übung", () => {
    // Nicht ans Ende: wer die Bank tauscht, will sie als erste Übung behalten.
    expect(ids(uebungenDerEinheit(plan, { a: { id: "neu" } }, []))).toEqual([
      "neu",
      "b",
      "c",
    ]);
  });

  it("kommt mit Auslassen, Tauschen und Dazunehmen gleichzeitig klar", () => {
    expect(
      ids(uebungenDerEinheit(plan, { a: { id: "neu" }, c: null }, [{ id: "extra" }]))
    ).toEqual(["neu", "b", "extra"]);
  });

  it("räumt den ganzen Tag ab, wenn alles ausgelassen wird", () => {
    expect(ids(uebungenDerEinheit(plan, { a: null, b: null, c: null }, []))).toEqual([]);
  });
});
