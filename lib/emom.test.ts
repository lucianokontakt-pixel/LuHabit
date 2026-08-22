import { describe, expect, it } from "vitest";
import {
  buildSegments,
  describeTemplate,
  formatSeconds,
  nextBoundaryElapsed,
  phaseAt,
  roundStartElapsed,
  totalDuration,
  type EmomTemplate,
} from "@/lib/emom";

function template(overrides: Partial<EmomTemplate> = {}): EmomTemplate {
  return {
    id: "t1",
    name: "EMOM",
    prepareSeconds: 10,
    rounds: 3,
    steps: [{ seconds: 60, reps: null, label: "Burpees" }],
    restSeconds: 0,
    position: 0,
    ...overrides,
  };
}

describe("buildSegments", () => {
  it("rollt einen Schritt auf alle Runden aus", () => {
    const segments = buildSegments(template());
    expect(segments).toHaveLength(3);
    expect(segments.map((s) => s.round)).toEqual([1, 2, 3]);
    expect(segments.map((s) => s.startsAt)).toEqual([0, 60, 120]);
  });

  it("wechselt bei mehreren Schritten reihum durch", () => {
    const segments = buildSegments(
      template({
        rounds: 2,
        steps: [
          { seconds: 90, reps: null, label: "Schwer" },
          { seconds: 60, reps: null, label: "Leicht" },
        ],
      })
    );
    expect(segments).toHaveLength(4);
    expect(segments.map((s) => s.label)).toEqual(["Schwer", "Leicht", "Schwer", "Leicht"]);
    expect(segments.map((s) => s.startsAt)).toEqual([0, 90, 150, 240]);
  });

  it("ignoriert Schritte ohne Dauer", () => {
    const segments = buildSegments(
      template({ rounds: 1, steps: [{ seconds: 60, reps: null, label: "A" }, { seconds: 0, reps: null, label: "B" }] })
    );
    expect(segments).toHaveLength(1);
  });

  it("liefert nichts ohne Schritte oder ohne Runden", () => {
    expect(buildSegments(template({ steps: [] }))).toEqual([]);
    expect(buildSegments(template({ rounds: 0 }))).toEqual([]);
  });

  it("markiert Arbeitsschritte als 'work'", () => {
    const segments = buildSegments(template());
    expect(segments.every((s) => s.kind === "work")).toBe(true);
  });

  it("reicht die Wiederholungen je Schritt an das Segment durch", () => {
    const segments = buildSegments(
      template({ rounds: 1, steps: [{ seconds: 30, reps: 12, label: "Burpees" }] })
    );
    expect(segments[0].reps).toBe(12);
  });

  it("hat bei Pausen-Segmenten keine Wiederholungen", () => {
    const segments = buildSegments(template({ rounds: 2, restSeconds: 10 }));
    const rest = segments.find((s) => s.kind === "rest");
    expect(rest?.reps).toBeNull();
  });

  it("fügt bei einem Schritt pro Runde eine Pause zwischen den Runden ein, aber nicht danach", () => {
    const segments = buildSegments(template({ rounds: 3, restSeconds: 20 }));
    // Ein Schritt pro Runde: "zwischen Übungen" und "zwischen Runden" fallen
    // zusammen — keine Pause nach der letzten Runde.
    expect(segments.map((s) => s.kind)).toEqual(["work", "rest", "work", "rest", "work"]);
    expect(segments.map((s) => s.startsAt)).toEqual([0, 60, 80, 140, 160]);
    expect(totalDuration(template({ rounds: 3, restSeconds: 20 }))).toBe(10 + 220);
  });

  it("lässt Runde 1 ohne Pause ohne restSeconds", () => {
    const segments = buildSegments(template({ rounds: 2, restSeconds: 0 }));
    expect(segments.every((s) => s.kind === "work")).toBe(true);
  });

  it("setzt die Pause nach jedem Schritt, auch innerhalb einer Runde", () => {
    const segments = buildSegments(
      template({
        rounds: 2,
        restSeconds: 15,
        steps: [
          { seconds: 30, reps: null, label: "A" },
          { seconds: 20, reps: null, label: "B" },
        ],
      })
    );
    // A, Pause, B, Pause, A, Pause, B — nur nach dem allerletzten Schritt
    // der allerletzten Runde fehlt sie.
    expect(segments.map((s) => s.kind)).toEqual([
      "work",
      "rest",
      "work",
      "rest",
      "work",
      "rest",
      "work",
    ]);
    expect(segments.map((s) => s.startsAt)).toEqual([0, 30, 45, 65, 80, 110, 125]);
  });
});

describe("totalDuration", () => {
  it("zählt Vorbereitung und alle Runden zusammen", () => {
    expect(totalDuration(template({ prepareSeconds: 10, rounds: 3 }))).toBe(190);
  });

  it("kommt ohne Vorbereitung aus", () => {
    expect(totalDuration(template({ prepareSeconds: 0, rounds: 2 }))).toBe(120);
  });
});

describe("phaseAt", () => {
  it("ist während der Vorbereitung im prepare-Zustand", () => {
    const phase = phaseAt(template(), 4);
    expect(phase.kind).toBe("prepare");
    if (phase.kind === "prepare") expect(phase.remaining).toBe(6);
  });

  it("startet Runde 1 exakt am Ende der Vorbereitung", () => {
    const phase = phaseAt(template(), 10);
    expect(phase.kind).toBe("work");
    if (phase.kind === "work") {
      expect(phase.segment.round).toBe(1);
      expect(phase.remaining).toBe(60);
    }
  });

  it("wechselt an der Rundengrenze in die nächste Runde", () => {
    const phase = phaseAt(template(), 70);
    expect(phase.kind).toBe("work");
    if (phase.kind === "work") expect(phase.segment.round).toBe(2);
  });

  it("zählt die Restzeit innerhalb einer Runde herunter", () => {
    const phase = phaseAt(template(), 25);
    if (phase.kind === "work") expect(phase.remaining).toBe(45);
    else throw new Error("erwartete work-Phase");
  });

  it("meldet den nächsten Schritt als Vorschau", () => {
    const phase = phaseAt(
      template({
        rounds: 2,
        steps: [
          { seconds: 60, reps: null, label: "Erst" },
          { seconds: 30, reps: null, label: "Dann" },
        ],
      }),
      15
    );
    if (phase.kind === "work") expect(phase.next?.label).toBe("Dann");
    else throw new Error("erwartete work-Phase");
  });

  it("hat nach der letzten Runde keinen nächsten Schritt", () => {
    const phase = phaseAt(template({ rounds: 1 }), 30);
    if (phase.kind === "work") expect(phase.next).toBeNull();
    else throw new Error("erwartete work-Phase");
  });

  it("ist am Ende fertig", () => {
    // 10s Vorbereitung + 3 × 60s = 190s
    expect(phaseAt(template(), 190).kind).toBe("done");
    expect(phaseAt(template(), 500).kind).toBe("done");
  });

  it("ist ohne Schritte sofort fertig", () => {
    expect(phaseAt(template({ steps: [] }), 0).kind).toBe("done");
  });

  it("überspringt die Vorbereitung, wenn sie 0 ist", () => {
    const phase = phaseAt(template({ prepareSeconds: 0 }), 0);
    expect(phase.kind).toBe("work");
    if (phase.kind === "work") expect(phase.segment.round).toBe(1);
  });

  it("bleibt nach einem Sprung in der Zeit auf der richtigen Runde", () => {
    // Handy war gesperrt: 155s verstrichen -> Runde 3 (10 + 2×60 = 130 .. 190)
    const phase = phaseAt(template(), 155);
    if (phase.kind === "work") {
      expect(phase.segment.round).toBe(3);
      expect(phase.remaining).toBe(35);
    } else throw new Error("erwartete work-Phase");
  });

  it("ist während der Pause zwischen Runden im rest-Segment", () => {
    // 10s Vorbereitung + 60s Runde 1 = 70 -> Pause beginnt bei 70
    const phase = phaseAt(template({ restSeconds: 20 }), 75);
    if (phase.kind === "work") {
      expect(phase.segment.kind).toBe("rest");
      expect(phase.segment.round).toBe(1);
      expect(phase.remaining).toBe(15);
      expect(phase.next?.kind).toBe("work");
      expect(phase.next?.round).toBe(2);
    } else throw new Error("erwartete work-Phase");
  });

  it("hat nach der letzten Runde keine Pause mehr", () => {
    // 10 + 3×60 + 2×20 = 230, letzte Runde endet bei 230
    expect(phaseAt(template({ restSeconds: 20 }), 229).kind).toBe("work");
    expect(phaseAt(template({ restSeconds: 20 }), 230).kind).toBe("done");
  });
});

describe("roundStartElapsed", () => {
  it("liegt für Runde 1 am Ende der Vorbereitung", () => {
    expect(roundStartElapsed(template(), 1)).toBe(10);
  });

  it("überspringt die Pause der Vorrunde", () => {
    const t = template({ rounds: 3, restSeconds: 20 });
    expect(roundStartElapsed(t, 2)).toBe(10 + 80); // nach Runde 1 (60) + Pause (20)
    expect(roundStartElapsed(t, 3)).toBe(10 + 160);
  });

  it("landet über der letzten Runde am Gesamtende", () => {
    const t = template({ rounds: 2 });
    expect(roundStartElapsed(t, 5)).toBe(totalDuration(t));
  });

  it("behandelt Runde 0 oder negativ wie Runde 1", () => {
    expect(roundStartElapsed(template(), 0)).toBe(10);
  });
});

describe("nextBoundaryElapsed", () => {
  it("springt aus der Vorbereitung an ihr Ende", () => {
    expect(nextBoundaryElapsed(template(), 3)).toBe(10);
  });

  it("springt aus einer Runde ans Ende des aktuellen Segments", () => {
    expect(nextBoundaryElapsed(template(), 30)).toBe(70);
  });

  it("springt aus einer Pause direkt zur nächsten Runde", () => {
    const t = template({ restSeconds: 20 });
    expect(nextBoundaryElapsed(t, 75)).toBe(90); // Pause endet bei 10+60+20=90
  });

  it("springt aus dem letzten Segment ans Gesamtende", () => {
    const t = template({ rounds: 1 });
    expect(nextBoundaryElapsed(t, 20)).toBe(totalDuration(t));
  });
});

describe("describeTemplate", () => {
  it("nennt beim einzelnen Schritt Runden und Dauer", () => {
    expect(describeTemplate(template({ rounds: 10 }))).toBe("10 × 60s");
  });

  it("zählt wechselnde Intervalle einzeln auf", () => {
    const text = describeTemplate(
      template({
        rounds: 5,
        steps: [
          { seconds: 90, reps: null, label: "" },
          { seconds: 60, reps: null, label: "" },
        ],
      })
    );
    expect(text).toBe("5 × (90s + 60s)");
  });

  it("zählt auch gleich lange Schritte einzeln auf", () => {
    // Zusammengefasst als "3 × 10s" läse sich das wie 30 statt 60 Sekunden.
    const text = describeTemplate(
      template({
        rounds: 3,
        steps: [
          { seconds: 10, reps: null, label: "" },
          { seconds: 10, reps: null, label: "" },
        ],
      })
    );
    expect(text).toBe("3 × (10s + 10s)");
  });

  it("sagt Bescheid, wenn nichts eingestellt ist", () => {
    expect(describeTemplate(template({ steps: [] }))).toBe("Keine Schritte");
  });

  it("hängt die Pause an, wenn eine eingestellt ist", () => {
    expect(describeTemplate(template({ rounds: 10, restSeconds: 15 }))).toBe(
      "10 × 60s · Pause 15s"
    );
  });

  it("lässt die Pause weg, wenn keine eingestellt ist", () => {
    expect(describeTemplate(template({ rounds: 10, restSeconds: 0 }))).toBe("10 × 60s");
  });
});

describe("formatSeconds", () => {
  it("zeigt mm:ss", () => {
    expect(formatSeconds(0)).toBe("0:00");
    expect(formatSeconds(9)).toBe("0:09");
    expect(formatSeconds(60)).toBe("1:00");
    expect(formatSeconds(605)).toBe("10:05");
  });

  it("rundet auf, damit die Anzeige nicht zu früh auf 0 springt", () => {
    expect(formatSeconds(0.3)).toBe("0:01");
  });

  it("zeigt keine negative Zeit", () => {
    expect(formatSeconds(-5)).toBe("0:00");
  });
});
