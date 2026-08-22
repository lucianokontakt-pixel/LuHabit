import { describe, expect, it } from "vitest";
import { newId, resolveNewId, validClientId, validSlugId } from "@/lib/ids";

describe("newId", () => {
  it("trägt das Präfix und übersteht die eigene Prüfung", () => {
    const id = newId("ws");
    expect(id.startsWith("ws-")).toBe(true);
    expect(validClientId("ws", id)).toBe(id);
  });

  it("vergibt nicht zweimal dieselbe", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId("plan")));
    expect(ids.size).toBe(500);
  });
});

describe("validClientId", () => {
  it("nimmt eine saubere ID an", () => {
    expect(validClientId("plan", "plan-mt4g0f34-7r5ada")).toBe("plan-mt4g0f34-7r5ada");
  });

  it("lehnt ein fremdes Präfix ab — sonst landet eine Einheit als Plan", () => {
    expect(validClientId("plan", "ws-mt4g0f34-7r5ada")).toBeNull();
  });

  it("lehnt das nackte Präfix ohne Rest ab", () => {
    expect(validClientId("plan", "plan-")).toBeNull();
  });

  it("lehnt Sonderzeichen ab", () => {
    expect(validClientId("plan", "plan-abc'; DROP TABLE")).toBeNull();
    expect(validClientId("plan", "plan-ABC")).toBeNull();
    expect(validClientId("plan", "plan-a b")).toBeNull();
  });

  it("lehnt übermäßig lange IDs ab", () => {
    expect(validClientId("plan", `plan-${"a".repeat(80)}`)).toBeNull();
  });

  it("lehnt alles ab, was kein Text ist", () => {
    expect(validClientId("plan", 42)).toBeNull();
    expect(validClientId("plan", null)).toBeNull();
    expect(validClientId("plan", { id: "plan-abc" })).toBeNull();
  });
});

describe("resolveNewId", () => {
  it("vergibt selbst eine, wenn keine mitkommt", () => {
    const id = resolveNewId("ws", undefined);
    expect(id?.startsWith("ws-")).toBe(true);
  });

  it("übernimmt die mitgeschickte unverändert", () => {
    expect(resolveNewId("ws", "ws-abc-def")).toBe("ws-abc-def");
  });

  it("meldet eine ungültige, statt heimlich eine andere zu vergeben", () => {
    expect(resolveNewId("ws", "quatsch")).toBeNull();
  });
});

describe("validSlugId", () => {
  it("nimmt einen Bezeichner aus einem Namen an", () => {
    expect(validSlugId("bankdruecken-lh")).toBe("bankdruecken-lh");
    expect(validSlugId("lesen")).toBe("lesen");
    expect(validSlugId("lesen-2")).toBe("lesen-2");
  });

  it("lehnt führende, doppelte und abschließende Bindestriche ab", () => {
    expect(validSlugId("-lesen")).toBeNull();
    expect(validSlugId("lesen-")).toBeNull();
    expect(validSlugId("le--sen")).toBeNull();
  });

  it("lehnt Leeres, Sonderzeichen und Großbuchstaben ab", () => {
    expect(validSlugId("")).toBeNull();
    expect(validSlugId("Lesen")).toBeNull();
    expect(validSlugId("lesen buch")).toBeNull();
    expect(validSlugId("lesen'; DROP TABLE")).toBeNull();
    expect(validSlugId(42)).toBeNull();
  });

  it("lehnt übermäßig lange Bezeichner ab", () => {
    expect(validSlugId("a".repeat(80))).toBeNull();
  });
});
