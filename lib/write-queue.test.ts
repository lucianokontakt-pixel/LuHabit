import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WriteOp } from "@/lib/write-ops";

/**
 * Die Warteschlange entscheidet, was mit einer Änderung passiert, die der
 * Server nicht annimmt — und genau dort ging bisher still eine Einheit
 * verloren. IndexedDB gibt es im Testlauf nicht, also steht hier ein
 * Speicher im Arbeitsspeicher an ihrer Stelle; geprüft wird die Entscheidung,
 * nicht die Ablage.
 */

type Queued = { seq: number; op: WriteOp; createdAt: string };
type Failed = Queued & { failedAt: string; reason: string };

const speicher = {
  queue: [] as Queued[],
  failed: [] as Failed[],
  effekte: 0,
};

vi.mock("@/lib/local-db", () => ({
  applyEffects: async () => {
    speicher.effekte++;
  },
  queueAll: async () => [...speicher.queue].sort((a, b) => a.seq - b.seq),
  queuePush: async (op: WriteOp) => {
    const seq = speicher.queue.length + speicher.failed.length + 1;
    speicher.queue.push({ seq, op, createdAt: "2026-09-02 10:00:00" });
    return seq;
  },
  queueRemove: async (seqs: number[]) => {
    speicher.queue = speicher.queue.filter((q) => !seqs.includes(q.seq));
  },
  failedPush: async (item: Queued, reason: string) => {
    speicher.failed.push({ ...item, failedAt: "2026-09-02T10:00:00.000Z", reason });
  },
  failedAll: async () => [...speicher.failed],
  failedRemove: async (seqs: number[]) => {
    speicher.failed = speicher.failed.filter((f) => !seqs.includes(f.seq));
  },
}));

vi.mock("@/lib/local-events", () => ({
  notifyLocalDataChanged: () => {},
  notifyFlushSucceeded: () => {},
  subscribeFlushSucceeded: () => () => {},
}));

const { enqueue, flushQueue, readFailed, discardFailed, retryFailed } = await import(
  "@/lib/write-queue"
);

const einheit = (id: string): WriteOp => ({
  kind: "session.save",
  isNew: true,
  session: {
    id,
    planId: "plan-1",
    dayId: "day-1",
    dayName: "Push",
    date: "2026-09-02",
    durationSeconds: 3600,
    note: null,
    sets: [],
  },
});

/** Antwortet einmal mit dem gegebenen Status, danach immer mit 200. */
function antworte(status: number, body: unknown = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status }))
  );
}

beforeEach(() => {
  speicher.queue = [];
  speicher.failed = [];
  speicher.effekte = 0;
  vi.unstubAllGlobals();
});

describe("Warteschlange: was mit Abgelehntem passiert", () => {
  it("räumt eine angenommene Änderung weg, ohne sie zu melden", async () => {
    antworte(200);
    await enqueue(einheit("ws-1"));
    await flushQueue();
    expect(speicher.queue).toHaveLength(0);
    expect(await readFailed()).toHaveLength(0);
  });

  it("hebt eine abgelehnte Änderung auf, statt sie wegzuwerfen", async () => {
    // Der Kern: die Operation muss aus der Schlange (ein zweiter Versuch heilt
    // eine Ablehnung nicht und blockierte alles dahinter) — aber der lokale
    // Zustand steht schon, also darf sie nicht spurlos verschwinden.
    antworte(400, { error: "Eine Einheit braucht mindestens einen Satz" });
    await enqueue(einheit("ws-1"));
    await flushQueue();

    expect(speicher.queue).toHaveLength(0);
    const offen = await readFailed();
    expect(offen).toHaveLength(1);
    expect(offen[0].reason).toBe("Eine Einheit braucht mindestens einen Satz");
  });

  it("nimmt den Grund des Servers, wenn er einen nennt", async () => {
    antworte(422, { error: "Datum liegt in der Zukunft" });
    await enqueue(einheit("ws-1"));
    await flushQueue();
    expect((await readFailed())[0].reason).toBe("Datum liegt in der Zukunft");
  });

  it("kommt auch ohne lesbare Antwort mit einem Grund zurecht", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("kein JSON", { status: 400 })));
    await enqueue(einheit("ws-1"));
    await flushQueue();
    expect((await readFailed())[0].reason).toContain("400");
  });

  it("meldet einen 404 auf etwas, das kein Löschen war", async () => {
    // Genau der Fall, der die Einheit gekostet hat: der Server kennt die ID
    // nicht, weil die Neuanlage nie ankam.
    antworte(404);
    await enqueue(einheit("ws-1"));
    await flushQueue();
    expect(await readFailed()).toHaveLength(1);
  });

  it("schweigt bei einem 404 auf eine Löschung", async () => {
    // Weg ist weg — das ist der gewünschte Zustand und keine Meldung wert.
    antworte(404);
    await enqueue({ kind: "session.delete", id: "ws-1" });
    await flushQueue();
    expect(await readFailed()).toHaveLength(0);
    expect(speicher.queue).toHaveLength(0);
  });

  it("lässt bei einem Serverfehler alles stehen und versucht es später", async () => {
    antworte(503);
    await enqueue(einheit("ws-1"));
    await flushQueue();
    expect(speicher.queue).toHaveLength(1);
    expect(await readFailed()).toHaveLength(0);
  });

  it("lässt bei fehlendem Netz alles stehen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    await enqueue(einheit("ws-1"));
    await flushQueue();
    expect(speicher.queue).toHaveLength(1);
    expect(await readFailed()).toHaveLength(0);
  });
});

describe("Warteschlange: was man mit Abgelehntem tun kann", () => {
  it("stellt es auf Wunsch wieder ein", async () => {
    antworte(400, { error: "abgelehnt" });
    await enqueue(einheit("ws-1"));
    await flushQueue();
    const [offen] = await readFailed();

    antworte(200);
    await retryFailed(offen.seq);
    expect(await readFailed()).toHaveLength(0);
  });

  it("verwirft es auf Wunsch endgültig", async () => {
    antworte(400, { error: "abgelehnt" });
    await enqueue(einheit("ws-1"));
    await flushQueue();
    const [offen] = await readFailed();

    await discardFailed(offen.seq);
    expect(await readFailed()).toHaveLength(0);
    expect(speicher.queue).toHaveLength(0);
  });
});
