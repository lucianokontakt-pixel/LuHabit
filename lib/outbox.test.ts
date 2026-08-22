import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionInput } from "@/lib/api-training";

const saveSession = vi.fn();
const addEntry = vi.fn();

vi.mock("@/lib/api-training", () => ({ saveSession: (p: SessionInput) => saveSession(p) }));
vi.mock("@/lib/api-client", () => ({ addEntry: (p: unknown) => addEntry(p) }));

const {
  flushOutbox,
  isOfflineError,
  pendingToSession,
  queueSession,
  readOutbox,
  removePending,
} = await import("@/lib/outbox");

function installStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
}

const payload: SessionInput = {
  planId: "plan1",
  dayId: "day1",
  dayName: "Push",
  date: "2026-08-22",
  durationSeconds: 3600,
  sets: [{ exerciseId: "bench", setIndex: 0, weight: 60, reps: 8, done: true, warmup: false }],
};

beforeEach(() => {
  installStorage();
  saveSession.mockReset();
  addEntry.mockReset();
});

describe("isOfflineError", () => {
  it("erkennt den abgebrochenen fetch", () => {
    expect(isOfflineError(new TypeError("Load failed"))).toBe(true);
  });

  it("hält einen Serverfehler nicht für einen Netzausfall", () => {
    expect(isOfflineError(new Error("Konnte Einheit nicht speichern"))).toBe(false);
  });
});

describe("pendingToSession", () => {
  it("zeigt die wartende Einheit wie eine gespeicherte", () => {
    const session = pendingToSession(queueSession(payload, 60));
    expect(session.dayName).toBe("Push");
    expect(session.date).toBe("2026-08-22");
    expect(session.sets).toHaveLength(1);
    expect(session.sets[0].done).toBe(true);
  });
});

describe("flushOutbox", () => {
  it("schickt wartende Einheiten samt Habit-Minuten los und leert die Schlange", async () => {
    queueSession(payload, 60);
    saveSession.mockResolvedValue({ id: "s1", date: "2026-08-22" });
    addEntry.mockResolvedValue({});

    expect(await flushOutbox()).toBe(1);
    expect(addEntry).toHaveBeenCalledWith({
      habit: "training",
      date: "2026-08-22",
      delta: 60,
    });
    expect(readOutbox()).toHaveLength(0);
  });

  it("behält die Einheit, solange kein Netz da ist", async () => {
    queueSession(payload, null);
    saveSession.mockRejectedValue(new TypeError("Load failed"));

    expect(await flushOutbox()).toBe(0);
    expect(readOutbox()).toHaveLength(1);
  });

  it("bricht beim ersten Netzfehler ab, statt die Reihenfolge zu zerreißen", async () => {
    queueSession(payload, null);
    queueSession({ ...payload, dayName: "Pull" }, null);
    saveSession.mockRejectedValue(new TypeError("Load failed"));

    await flushOutbox();
    expect(saveSession).toHaveBeenCalledTimes(1);
    expect(readOutbox().map((p) => p.payload.dayName)).toEqual(["Push", "Pull"]);
  });

  it("verwirft eine Einheit, die der Server ablehnt — sie käme sonst nie durch", async () => {
    queueSession(payload, null);
    saveSession.mockRejectedValue(new Error("Ungültige Einheit"));

    expect(await flushOutbox()).toBe(0);
    expect(readOutbox()).toHaveLength(0);
  });
});

describe("removePending", () => {
  it("wirft eine wartende Einheit wieder raus", () => {
    const entry = queueSession(payload, null);
    removePending(entry.localId);
    expect(readOutbox()).toHaveLength(0);
  });
});
