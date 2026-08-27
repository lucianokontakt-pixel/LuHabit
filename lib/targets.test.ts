import { describe, expect, it } from "vitest";
import {
  computeTargets,
  readSession,
  stallCount,
  deloadTo,
  DELOAD_AFTER,
  expandTargets,
  effectiveLoad,
  measuredOn,
  formatLoggedSets,
  setLabels,
  sessionVolume,
  workingSets,
  nextDayFor,
  retargetWeight,
  suggestAdjustment,
  type Exercise,
  type PlanDay,
  type PlanExercise,
  type WorkoutPlan,
  type WorkoutSet,
} from "@/lib/training";

const bench: Exercise = {
  id: "bench",
  name: "Bankdrücken",
  muscle: "chest",
  equipment: "barbell",
  isCustom: false,
  hidden: false,
  increment: null,
  bodyweightFactor: 0.6,
  loadFactor: null,
  warmup: null,
  media: null,
  secondary: [],
  en: null,
};

const pullup: Exercise = {
  id: "pullup",
  name: "Klimmzüge",
  muscle: "back",
  equipment: "bodyweight",
  isCustom: false,
  hidden: false,
  increment: null,
  bodyweightFactor: null,
  loadFactor: null,
  warmup: null,
  media: null,
  secondary: [],
  en: null,
};

const squat: Exercise = {
  id: "squat",
  name: "Kniebeugen",
  muscle: "quads",
  equipment: "barbell",
  isCustom: false,
  hidden: false,
  increment: null,
  bodyweightFactor: 0.75,
  loadFactor: null,
  warmup: null,
  media: null,
  secondary: [],
  en: null,
};

function plan(overrides: Partial<PlanExercise> = {}): PlanExercise {
  return {
    id: "pe",
    exerciseId: "bench",
    position: 0,
    sets: 3,
    repMin: 8,
    repMax: 12,
    restSeconds: 120,
    increment: null,
    startWeight: null,
    ...overrides,
  };
}

function set(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
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

/** Kürzel: n Sätze mit demselben Gewicht und derselben Wiederholungszahl. */
function sets(count: number, weight: number, reps: number): WorkoutSet[] {
  return Array.from({ length: count }, (_, i) => set({ setIndex: i, weight, reps }));
}

describe("computeTargets — erste Einheit", () => {
  it("schlägt aus dem Körpergewicht ein Startgewicht vor", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      history: [[]],
      bodyweight: 80,
    });
    expect(result.isFirstTime).toBe(true);
    // 80 × 0,6 = 48 → auf 2,5er gerundet
    expect(result.targets[0].weight).toBe(47.5);
    expect(result.targets).toHaveLength(3);
    expect(result.targets.every((t) => t.reps === 8)).toBe(true);
  });

  it("nimmt ein gesetztes Startgewicht aus dem Plan statt der Faustformel", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan({ startWeight: 60 }),
      history: [[]],
      bodyweight: 80,
    });
    expect(result.targets[0].weight).toBe(60);
  });

  it("startet Eigengewichtsübungen bei 0 kg", () => {
    const result = computeTargets({
      exercise: pullup,
      planExercise: plan({ exerciseId: "pullup" }),
      history: [[]],
      bodyweight: 80,
    });
    expect(result.targets[0].weight).toBe(0);
    expect(result.isFirstTime).toBe(true);
  });

  it("schlägt ohne bekanntes Körpergewicht nichts vor", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      history: [[]],
      bodyweight: null,
    });
    expect(result.targets[0].weight).toBe(0);
  });
});

describe("computeTargets — Double Progression", () => {
  it("erhöht das Gewicht, wenn alle Sätze die Obergrenze erreicht haben", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      history: [sets(3, 80, 12)],
      bodyweight: 80,
    });
    expect(result.progressed).toBe(true);
    expect(result.progressionKind).toBe("weight");
    expect(result.targets[0].weight).toBe(82.5);
    // Nach dem Sprung beginnt der Bereich wieder unten.
    expect(result.targets.every((t) => t.reps === 8)).toBe(true);
  });

  it("nimmt für Unterkörper den größeren Sprung", () => {
    const result = computeTargets({
      exercise: squat,
      planExercise: plan({ exerciseId: "squat" }),
      history: [sets(3, 100, 12).map((s) => ({ ...s, exerciseId: "squat" }))],
      bodyweight: 80,
    });
    expect(result.targets[0].weight).toBe(105);
  });

  it("bleibt stehen, wenn ein Satz die Obergrenze verfehlt", () => {
    const lastSets = [
      set({ setIndex: 0, weight: 80, reps: 12 }),
      set({ setIndex: 1, weight: 80, reps: 12 }),
      set({ setIndex: 2, weight: 80, reps: 10 }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    expect(result.progressed).toBe(false);
    expect(result.targets.map((t) => t.weight)).toEqual([80, 80, 80]);
    // Jeder Satz behält sein eigenes Ziel — der dritte hat noch Luft.
    // Jeder Satz bekommt eine Wiederholung mehr als zuletzt, gedeckelt bei
    // repMax — aus 12/12/10 wird 12/12/11, nicht nochmal 12/12/10.
    expect(result.targets.map((t) => t.reps)).toEqual([12, 12, 11]);
  });

  it("löst keine Steigerung aus, wenn die Einheit abgebrochen wurde", () => {
    // Zwei starke Sätze, aber der Plan verlangt drei.
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      history: [sets(2, 80, 12)],
      bodyweight: 80,
    });
    expect(result.progressed).toBe(false);
    expect(result.targets[0].weight).toBe(80);
  });

  it("ignoriert leichtere Aufwärmsätze bei der Progression", () => {
    const lastSets = [
      set({ setIndex: 0, weight: 50, reps: 12 }),
      set({ setIndex: 1, weight: 80, reps: 12 }),
      set({ setIndex: 2, weight: 80, reps: 12 }),
      set({ setIndex: 3, weight: 80, reps: 12 }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    expect(result.progressed).toBe(true);
    expect(result.targets[0].weight).toBe(82.5);
  });

  it("zählt nicht abgehakte Sätze nicht mit", () => {
    const lastSets = [
      set({ setIndex: 0, weight: 80, reps: 12 }),
      set({ setIndex: 1, weight: 80, reps: 12 }),
      set({ setIndex: 2, weight: 80, reps: 12, done: false }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    expect(result.progressed).toBe(false);
  });

  it("respektiert einen Gewichtssprung aus dem Plan", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan({ increment: 1.25 }),
      history: [sets(3, 80, 12)],
      bodyweight: 80,
    });
    expect(result.targets[0].weight).toBe(81.25);
  });
});

describe("computeTargets — Eigengewicht ohne Zusatzgewicht", () => {
  const pullupPlan = plan({ exerciseId: "pullup", repMin: 6, repMax: 10 });

  it("hängt an der Obergrenze einen Satz an statt das Gewicht zu erhöhen", () => {
    const result = computeTargets({
      exercise: pullup,
      planExercise: pullupPlan,
      history: [sets(3, 0, 10).map((s) => ({ ...s, exerciseId: "pullup" }))],
      bodyweight: 80,
    });
    expect(result.progressed).toBe(true);
    expect(result.progressionKind).toBe("reps");
    // 3 × 10 geschafft → 4 × 6. Ein Sprung auf 2,5 kg wäre am Klimmzugturm
    // nicht umsetzbar, ein vierter Satz schon.
    expect(result.sets).toBe(4);
    expect(result.targets).toHaveLength(4);
    expect(result.targets.every((t) => t.weight === 0 && t.reps === 6)).toBe(true);
  });

  it("hört bei sechs Sätzen auf und sagt, dass jetzt Gewicht dran ist", () => {
    const result = computeTargets({
      exercise: pullup,
      planExercise: plan({ exerciseId: "pullup", repMin: 6, repMax: 10, sets: 6 }),
      history: [
        Array.from({ length: 6 }, (_, i) =>
          set({ exerciseId: "pullup", setIndex: i, weight: 0, reps: 10 })
        ),
      ],
      bodyweight: 80,
    });
    expect(result.kind).toBe("ceiling");
    expect(result.progressed).toBe(false);
    expect(result.sets).toBeUndefined();
    expect(result.why).toContain("schwerere Variante");
  });

  it("lässt ein über die Obergrenze gewachsenes Ziel stehen", () => {
    const lastSets = [
      set({ exerciseId: "pullup", setIndex: 0, weight: 0, reps: 14 }),
      set({ exerciseId: "pullup", setIndex: 1, weight: 0, reps: 9 }),
      set({ exerciseId: "pullup", setIndex: 2, weight: 0, reps: 8 }),
    ];
    const result = computeTargets({
      exercise: pullup,
      planExercise: pullupPlan,
      history: [lastSets],
      bodyweight: 80,
    });
    expect(result.progressed).toBe(false);
    // Der starke Satz darf sein Ziel behalten, statt auf repMax gekappt zu
    // werden; die schwächeren steigen um eine Wiederholung.
    expect(result.targets.map((t) => t.reps)).toEqual([14, 10, 9]);
  });

  it("wechselt auf Gewichtsprogression, sobald Zusatzgewicht dabei ist", () => {
    const result = computeTargets({
      exercise: pullup,
      planExercise: pullupPlan,
      history: [sets(3, 10, 10).map((s) => ({ ...s, exerciseId: "pullup" }))],
      bodyweight: 80,
    });
    expect(result.progressionKind).toBe("weight");
    expect(result.targets[0].weight).toBe(12.5);
  });
});

describe("computeTargets — gescheitertes Topgewicht", () => {
  it("nimmt nach einer Reduktion das Gewicht, auf dem gearbeitet wurde", () => {
    // 17,5 kg war zu schwer (4 statt 8 Wdh), danach auf 15 kg reduziert.
    const lastSets = [
      set({ setIndex: 0, weight: 17.5, reps: 4 }),
      set({ setIndex: 1, weight: 15, reps: 8 }),
      set({ setIndex: 2, weight: 15, reps: 8 }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    expect(result.targets.map((t) => t.weight)).toEqual([15, 15, 15]);
  });

  it("behält das Aufwärm-Verhalten bei aufsteigenden Sätzen", () => {
    // Gegenprobe: hier ist das schwerste Gewicht sehr wohl das Arbeitsgewicht.
    const lastSets = [
      set({ setIndex: 0, weight: 50, reps: 12 }),
      set({ setIndex: 1, weight: 80, reps: 8 }),
      set({ setIndex: 2, weight: 80, reps: 8 }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    expect(result.targets[0].weight).toBe(80);
  });

  it("bleibt beim schwersten Gewicht, wenn nirgends die Untergrenze fiel", () => {
    const lastSets = [
      set({ setIndex: 0, weight: 80, reps: 5 }),
      set({ setIndex: 1, weight: 75, reps: 6 }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    expect(result.targets[0].weight).toBe(80);
  });
});

describe("expandTargets", () => {
  it("übernimmt für jeden Satz sein eigenes Ziel", () => {
    // Der Fehler, der das hier nötig gemacht hat: die Live-Session nahm nur
    // targets[0] und schrieb es in alle Sätze. Aus 8/9/10 wurde 8/8/8 — und wer
    // das abhakte, protokollierte einen Rückschritt.
    const targets = [
      { weight: 40, reps: 8 },
      { weight: 40, reps: 9 },
      { weight: 40, reps: 10 },
    ];
    expect(expandTargets(targets, 3).map((t) => t.reps)).toEqual([8, 9, 10]);
  });

  it("füllt fehlende Sätze mit dem letzten Ziel auf", () => {
    const targets = [
      { weight: 40, reps: 8 },
      { weight: 40, reps: 9 },
    ];
    expect(expandTargets(targets, 4).map((t) => t.reps)).toEqual([8, 9, 9, 9]);
  });

  it("schneidet überzählige Ziele ab", () => {
    const targets = [
      { weight: 40, reps: 8 },
      { weight: 40, reps: 9 },
      { weight: 40, reps: 10 },
    ];
    expect(expandTargets(targets, 2).map((t) => t.reps)).toEqual([8, 9]);
  });

  it("bleibt ohne Ziele leer", () => {
    expect(expandTargets([], 3)).toEqual([]);
  });

  it("rollt die Ziele einer echten Progression vollständig aus", () => {
    // Ende-zu-Ende: letzte Einheit 40 kg mit 8/9/10 → Vorschlag 8/9/10.
    const lastSets = [
      set({ setIndex: 0, weight: 40, reps: 8 }),
      set({ setIndex: 1, weight: 40, reps: 9 }),
      set({ setIndex: 2, weight: 40, reps: 10 }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    const expanded = expandTargets(result.targets, 3);
    expect(expanded.map((t) => `${t.weight}×${t.reps}`)).toEqual(["40×9", "40×10", "40×11"]);
  });
});

describe("retargetWeight", () => {
  const inc = 2.5;

  it("gibt bei genau getroffener Obergrenze genau einen Sprung", () => {
    // Der wichtigste Fall: die bestehende Doppelprogression darf sich nicht
    // ändern. Die Formel allein ergäbe hier das Ausgangsgewicht.
    expect(retargetWeight({ weight: 40, reps: 12, targetReps: 12, increment: inc })).toBe(42.5);
  });

  it("springt bei leichter Überschreitung eine Stufe", () => {
    expect(retargetWeight({ weight: 40, reps: 15, targetReps: 12, increment: inc })).toBe(42.5);
  });

  it("springt bei deutlicher Überschreitung weiter", () => {
    // 40 × 20 entspricht rund 46,7 kg für 12 Wiederholungen.
    expect(retargetWeight({ weight: 40, reps: 20, targetReps: 12, increment: inc })).toBe(47.5);
  });

  it("deckelt den Sprung nach oben", () => {
    // Ohne Deckel läge der Vorschlag bei 52,5 kg.
    expect(retargetWeight({ weight: 40, reps: 25, targetReps: 12, increment: inc })).toBe(50);
  });

  it("reduziert, wenn die Untergrenze verfehlt wurde", () => {
    expect(retargetWeight({ weight: 80, reps: 5, targetReps: 8, increment: inc })).toBe(72.5);
  });

  it("deckelt auch die Reduktion", () => {
    expect(retargetWeight({ weight: 80, reps: 1, targetReps: 8, increment: inc })).toBe(70);
  });

  it("geht bei knapper Unterschreitung mindestens eine Stufe runter", () => {
    expect(retargetWeight({ weight: 80, reps: 7, targetReps: 8, increment: inc })).toBe(77.5);
  });

  it("nutzt den Sprung der Übung", () => {
    expect(retargetWeight({ weight: 100, reps: 12, targetReps: 12, increment: 5 })).toBe(105);
  });

  it("lässt Eigengewicht unangetastet", () => {
    expect(retargetWeight({ weight: 0, reps: 20, targetReps: 12, increment: inc })).toBe(0);
  });

  it("fällt bei kleinen Gewichten nicht unter einen Sprung", () => {
    expect(retargetWeight({ weight: 2.5, reps: 2, targetReps: 10, increment: inc })).toBe(2.5);
  });
});

describe("computeTargets — Sprunghöhe nach Überschreitung", () => {
  it("springt weiter, wenn die Obergrenze deutlich übertroffen wurde", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      history: [sets(3, 40, 20)],
      bodyweight: 80,
    });
    expect(result.progressed).toBe(true);
    expect(result.targets[0].weight).toBe(47.5);
  });

  it("richtet sich nach dem schwächsten Satz auf dem Topgewicht", () => {
    const lastSets = [
      set({ setIndex: 0, weight: 40, reps: 20 }),
      set({ setIndex: 1, weight: 40, reps: 18 }),
      set({ setIndex: 2, weight: 40, reps: 12 }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    // Der 12er-Satz gibt den Takt vor, nicht der 20er.
    expect(result.targets[0].weight).toBe(42.5);
  });
});

describe("suggestAdjustment", () => {
  const range = { repMin: 8, repMax: 12, increment: 2.5 };

  it("schlägt nach einem zu leichten Satz mehr Gewicht vor", () => {
    const result = suggestAdjustment({
      sets: [
        { weight: 40, reps: 15, done: true },
        { weight: 40, reps: 8, done: false },
        { weight: 40, reps: 8, done: false },
      ],
      ...range,
    });
    expect(result).toMatchObject({ direction: "up", index: 0, nextWeight: 42.5, hasRemaining: true });
  });

  it("schlägt nach einem zu schweren Satz weniger Gewicht vor", () => {
    const result = suggestAdjustment({
      sets: [
        { weight: 80, reps: 5, done: true },
        { weight: 80, reps: 8, done: false },
      ],
      ...range,
    });
    expect(result).toMatchObject({ direction: "down", nextWeight: 72.5, hasRemaining: true });
  });

  it("schweigt innerhalb des Wiederholungsbereichs", () => {
    expect(
      suggestAdjustment({
        sets: [
          { weight: 40, reps: 10, done: true },
          { weight: 40, reps: 8, done: false },
        ],
        ...range,
      })
    ).toBeNull();
  });

  it("schweigt an der Obergrenze — das ist normale Progression", () => {
    expect(
      suggestAdjustment({
        sets: [
          { weight: 40, reps: 12, done: true },
          { weight: 40, reps: 8, done: false },
        ],
        ...range,
      })
    ).toBeNull();
  });

  it("nimmt den zuletzt abgehakten Satz, nicht den ersten", () => {
    const result = suggestAdjustment({
      sets: [
        { weight: 40, reps: 15, done: true },
        { weight: 45, reps: 14, done: true },
        { weight: 45, reps: 8, done: false },
      ],
      ...range,
    });
    expect(result?.index).toBe(1);
    expect(result?.weight).toBe(45);
  });

  it("merkt, wenn kein offener Satz mehr übrig ist", () => {
    const result = suggestAdjustment({
      sets: [
        { weight: 40, reps: 12, done: true },
        { weight: 40, reps: 12, done: true },
        { weight: 40, reps: 16, done: true },
      ],
      ...range,
    });
    expect(result).toMatchObject({ direction: "up", hasRemaining: false });
  });

  it("bietet ohne offene Sätze keinen Zusatzsatz mit weniger Gewicht an", () => {
    expect(
      suggestAdjustment({
        sets: [{ weight: 80, reps: 4, done: true }],
        ...range,
      })
    ).toBeNull();
  });

  it("schweigt ohne abgehakten Satz", () => {
    expect(
      suggestAdjustment({ sets: [{ weight: 40, reps: 8, done: false }], ...range })
    ).toBeNull();
  });

  it("gibt bei Zusatzgewicht die Gewichtsachse an", () => {
    const result = suggestAdjustment({
      sets: [
        { weight: 40, reps: 15, done: true },
        { weight: 40, reps: 8, done: false },
      ],
      ...range,
    });
    expect(result?.axis).toBe("weight");
    // Nach einem Sprung beginnt der Bereich wieder unten.
    expect(result?.nextReps).toBe(8);
  });
});

describe("suggestAdjustment — Eigengewicht", () => {
  const range = { repMin: 6, repMax: 12, increment: 2.5 };

  it("hebt das Wiederholungsziel der restlichen Sätze an", () => {
    const result = suggestAdjustment({
      sets: [
        { weight: 0, reps: 20, done: true },
        { weight: 0, reps: 12, done: false },
        { weight: 0, reps: 12, done: false },
      ],
      ...range,
    });
    expect(result).toMatchObject({
      axis: "reps",
      direction: "up",
      nextReps: 20,
      nextWeight: 0,
      hasRemaining: true,
    });
  });

  it("senkt es, wenn der Satz deutlich unter dem anstehenden Ziel blieb", () => {
    // Das Ziel war über die Obergrenze hinausgewachsen — dann ist repMax kein
    // Maßstab mehr, sondern das, was noch ansteht.
    const result = suggestAdjustment({
      sets: [
        { weight: 0, reps: 10, done: true },
        { weight: 0, reps: 15, done: false },
      ],
      ...range,
    });
    expect(result).toMatchObject({ axis: "reps", direction: "down", nextReps: 10 });
  });

  it("schweigt bei einer Wiederholung Unterschied", () => {
    // 8/9/10 ist die normale Staffelung aus der letzten Einheit, kein Anlass.
    expect(
      suggestAdjustment({
        sets: [
          { weight: 0, reps: 8, done: true },
          { weight: 0, reps: 9, done: false },
          { weight: 0, reps: 10, done: false },
        ],
        ...range,
      })
    ).toBeNull();
  });

  it("bietet ohne offene Sätze einen Zusatzsatz an, wenn die Obergrenze fiel", () => {
    const result = suggestAdjustment({
      sets: [
        { weight: 0, reps: 12, done: true },
        { weight: 0, reps: 18, done: true },
      ],
      ...range,
    });
    expect(result).toMatchObject({ axis: "reps", direction: "up", nextReps: 18, hasRemaining: false });
  });

  it("bietet ohne offene Sätze nichts an, solange die Obergrenze steht", () => {
    expect(
      suggestAdjustment({
        sets: [{ weight: 0, reps: 10, done: true }],
        ...range,
      })
    ).toBeNull();
  });

  it("wechselt auf die Gewichtsachse, sobald Zusatzgewicht dabei ist", () => {
    const result = suggestAdjustment({
      sets: [
        { weight: 10, reps: 20, done: true },
        { weight: 10, reps: 8, done: false },
      ],
      ...range,
    });
    expect(result?.axis).toBe("weight");
  });
});

describe("Aufwärmsätze", () => {
  it("workingSets lässt Aufwärmsätze und offene Sätze weg", () => {
    const list = [
      set({ setIndex: 0, weight: 20, reps: 10, warmup: true }),
      set({ setIndex: 1, weight: 80, reps: 8 }),
      set({ setIndex: 2, weight: 80, reps: 8, done: false }),
    ];
    expect(workingSets(list).map((s) => s.weight)).toEqual([80]);
  });

  it("definieren nie das Arbeitsgewicht", () => {
    // Eine schwere Rampe wäre ohne Markierung das "Topgewicht" gewesen.
    const lastSets = [
      set({ setIndex: 0, weight: 100, reps: 3, warmup: true }),
      set({ setIndex: 1, weight: 80, reps: 8 }),
      set({ setIndex: 2, weight: 80, reps: 8 }),
      set({ setIndex: 3, weight: 80, reps: 8 }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    expect(result.targets.map((t) => t.weight)).toEqual([80, 80, 80]);
  });

  it("blockieren die Steigerung nicht", () => {
    const lastSets = [
      set({ setIndex: 0, weight: 40, reps: 10, warmup: true }),
      set({ setIndex: 1, weight: 80, reps: 12 }),
      set({ setIndex: 2, weight: 80, reps: 12 }),
      set({ setIndex: 3, weight: 80, reps: 12 }),
    ];
    const result = computeTargets({ exercise: bench, planExercise: plan(), history: [lastSets], bodyweight: 80 });
    expect(result.progressed).toBe(true);
    expect(result.targets[0].weight).toBe(82.5);
  });

  it("zählen nicht ins Volumen", () => {
    const session = {
      id: "a",
      planId: null,
      dayId: null,
      dayName: "Push",
      date: "2026-01-01",
      durationSeconds: null,
      note: null,
      sets: [
        set({ setIndex: 0, weight: 20, reps: 10, warmup: true }),
        set({ setIndex: 1, weight: 80, reps: 10 }),
      ],
    };
    expect(sessionVolume(session)).toBe(800);
  });

  it("lösen keinen Vorschlag aus", () => {
    // Dass die Rampe leicht war, ist ihr Sinn — kein Grund, am Gewicht zu drehen.
    expect(
      suggestAdjustment({
        sets: [
          { weight: 20, reps: 20, done: true, warmup: true },
          { weight: 80, reps: 8, done: false },
        ],
        repMin: 8,
        repMax: 12,
        increment: 2.5,
      })
    ).toBeNull();
  });

  it("zählen bei den offenen Sätzen nicht als Rest", () => {
    const result = suggestAdjustment({
      sets: [
        { weight: 80, reps: 15, done: true },
        { weight: 20, reps: 10, done: false, warmup: true },
      ],
      repMin: 8,
      repMax: 12,
      increment: 2.5,
    });
    // Nur ein Aufwärmsatz steht noch offen — das ist kein Arbeitssatz mehr,
    // also geht es um einen zusätzlichen.
    expect(result?.hasRemaining).toBe(false);
  });
});

describe("setLabels", () => {
  it("nummeriert Arbeitssätze unabhängig von den Aufwärmzeilen", () => {
    const list = [
      { warmup: true },
      { warmup: true },
      { warmup: false },
      { warmup: false },
      { warmup: false },
    ];
    expect(setLabels(list)).toEqual(["W", "W", "1", "2", "3"]);
  });

  it("kommt auch mit einer Aufwärmzeile mittendrin klar", () => {
    expect(setLabels([{ warmup: false }, { warmup: true }, { warmup: false }])).toEqual([
      "1",
      "W",
      "2",
    ]);
  });
});

describe("formatLoggedSets", () => {
  it("schreibt jeden Satz einzeln hin", () => {
    expect(
      formatLoggedSets([
        { weight: 57.5, reps: 10 },
        { weight: 57.5, reps: 9 },
        { weight: 57.5, reps: 10 },
      ])
    ).toBe("57,5×10 · 57,5×9 · 57,5×10");
  });

  it("lässt bei Eigengewicht das Gewicht weg statt 0 zu schreiben", () => {
    expect(
      formatLoggedSets([
        { weight: 0, reps: 12 },
        { weight: 0, reps: 10 },
      ])
    ).toBe("12 · 10");
  });

  it("zeigt Zusatzgewicht auch bei Eigengewichtsübungen", () => {
    expect(formatLoggedSets([{ weight: 10, reps: 8 }])).toBe("10×8");
  });

  it("bleibt bei einer leeren Liste leer", () => {
    expect(formatLoggedSets([])).toBe("");
  });
});

describe("effectiveLoad", () => {
  const pullupWithLoad = { ...pullup, loadFactor: 1 };
  const pushup = { ...pullup, id: "pushup", loadFactor: 0.65 };

  it("zählt bei Klimmzügen das ganze Körpergewicht", () => {
    expect(effectiveLoad({ weight: 0 }, pullupWithLoad, 80)).toBe(80);
  });

  it("addiert Zusatzgewicht dazu", () => {
    expect(effectiveLoad({ weight: 10 }, pullupWithLoad, 80)).toBe(90);
  });

  it("nimmt bei Liegestützen nur den Anteil", () => {
    expect(effectiveLoad({ weight: 0 }, pushup, 80)).toBe(52);
  });

  it("bleibt ohne Faktor beim Hantelgewicht", () => {
    expect(effectiveLoad({ weight: 80 }, bench, 80)).toBe(80);
  });

  it("bleibt ohne gemessenes Körpergewicht beim Zusatzgewicht", () => {
    expect(effectiveLoad({ weight: 0 }, pullupWithLoad, null)).toBe(0);
  });

  it("wertet einen Faktor von 0 wie keinen — Plank hat kein sinnvolles kg", () => {
    expect(effectiveLoad({ weight: 0 }, { ...pullup, loadFactor: 0 }, 80)).toBe(0);
  });

  it("schlägt bis ins Volumen durch", () => {
    const session = {
      id: "a",
      planId: null,
      dayId: null,
      dayName: "Pull",
      date: "2026-01-01",
      durationSeconds: null,
      note: null,
      sets: [set({ exerciseId: "pullup", weight: 0, reps: 10 })],
    };
    expect(sessionVolume(session, { pullup: pullupWithLoad }, 80)).toBe(800);
    // Ohne Körpergewicht bleibt es bei der alten Null.
    expect(sessionVolume(session, { pullup: pullupWithLoad }, null)).toBe(0);
  });
});

describe("measuredOn", () => {
  const entries = [
    { date: "2026-01-01", value: 78 },
    { date: "2026-02-01", value: 80 },
    { date: "2026-03-01", value: 82 },
  ];

  it("nimmt den Wert vom Tag der Einheit, nicht den neuesten", () => {
    expect(measuredOn("2026-02-15", entries)).toBe(80);
  });

  it("nimmt einen Wert vom selben Tag", () => {
    expect(measuredOn("2026-02-01", entries)).toBe(80);
  });

  it("gibt ohne früheren Wert null zurück", () => {
    expect(measuredOn("2025-12-31", entries)).toBeNull();
    expect(measuredOn("2026-01-01", [])).toBeNull();
  });
});

describe("nextDayFor", () => {
  function day(id: string, position: number, weekday: number | null = null): PlanDay {
    return { id, name: id, position, weekday, exercises: [] };
  }

  const rotation: WorkoutPlan = {
    id: "p",
    name: "PPL",
    isActive: true,
    position: 0,
    weeklyTarget: 3,
    days: [day("push", 0), day("pull", 1), day("legs", 2)],
  };

  // Ein Mittwoch.
  const wednesday = new Date("2026-01-14T12:00:00");

  it("nimmt den Tag nach dem zuletzt trainierten", () => {
    expect(nextDayFor(rotation, { dayId: "push" }, wednesday)?.id).toBe("pull");
    expect(nextDayFor(rotation, { dayId: "pull" }, wednesday)?.id).toBe("legs");
  });

  it("beginnt nach dem letzten Tag wieder vorne", () => {
    expect(nextDayFor(rotation, { dayId: "legs" }, wednesday)?.id).toBe("push");
  });

  it("startet ohne Verlauf beim ersten Tag", () => {
    expect(nextDayFor(rotation, undefined, wednesday)?.id).toBe("push");
  });

  it("fängt bei einem gelöschten Tag wieder vorne an", () => {
    expect(nextDayFor(rotation, { dayId: "geloescht" }, wednesday)?.id).toBe("push");
  });

  it("lässt einen fest terminierten Wochentag gewinnen", () => {
    const fixed: WorkoutPlan = {
      ...rotation,
      // Mittwoch ist Index 2 (Montag = 0).
      days: [day("push", 0), day("pull", 1), day("legs", 2, 2)],
    };
    expect(nextDayFor(fixed, { dayId: "push" }, wednesday)?.id).toBe("legs");
  });

  it("gibt bei einem Plan ohne Tage nichts zurück", () => {
    expect(nextDayFor({ ...rotation, days: [] }, undefined, wednesday)).toBeNull();
  });

  it("sortiert nach position, nicht nach Reihenfolge im Array", () => {
    const shuffled: WorkoutPlan = {
      ...rotation,
      days: [day("legs", 2), day("push", 0), day("pull", 1)],
    };
    expect(nextDayFor(shuffled, { dayId: "push" }, wednesday)?.id).toBe("pull");
  });
});


describe("readSession — ehrliches Lesen einer Einheit", () => {
  it("nennt eine volle Einheit auf Untergrenze erfüllt", () => {
    expect(readSession(sets(3, 60, 8), plan()).ok).toBe(true);
  });

  it("wertet weniger Sätze als geplant als verfehlt", () => {
    // Zwei starke Sätze und dann Feierabend sind keine erfüllte Vorgabe —
    // sonst könnte eine abgebrochene Einheit die Last steigern.
    expect(readSession(sets(2, 60, 12), plan()).ok).toBe(false);
  });

  it("wertet zu wenige Wiederholungen als verfehlt", () => {
    expect(readSession(sets(3, 60, 7), plan()).ok).toBe(false);
  });

  it("zählt Aufwärmsätze nicht mit", () => {
    const mitAufwaermen = [
      set({ setIndex: 0, weight: 30, reps: 10, warmup: true }),
      ...sets(3, 60, 8).map((s, i) => ({ ...s, setIndex: i + 1 })),
    ];
    const gelesen = readSession(mitAufwaermen, plan());
    expect(gelesen.ok).toBe(true);
    expect(gelesen.weight).toBe(60);
  });

  it("liest eine leere Einheit als verfehlt statt zu stolpern", () => {
    expect(readSession([], plan())).toEqual({ ok: false, weight: 0, lowestReps: 0, sets: 0 });
  });
});

describe("stallCount", () => {
  const p = plan();

  it("zählt nur die jüngste Serie von Fehlschlägen", () => {
    const verlauf = [sets(3, 60, 7), sets(3, 60, 8), sets(3, 60, 7), sets(3, 60, 7)];
    expect(stallCount(verlauf, p)).toBe(2);
  });

  it("gibt null zurück, wenn die letzte Einheit saß", () => {
    expect(stallCount([sets(3, 60, 7), sets(3, 60, 9)], p)).toBe(0);
  });

  it("zählt die allererste Einheit nie mit", () => {
    // Beim ersten Mal tastet man sich an ein Gewicht heran. Das als Fehlschlag
    // zu führen, würde einen Rückschritt aus dem Kennenlernen auslösen.
    expect(stallCount([sets(3, 60, 7)], p)).toBe(0);
    expect(stallCount([sets(3, 60, 7), sets(3, 60, 7)], p)).toBe(1);
  });

  it("meldet keinen Stillstand, wenn nur die Wiederholungen wachsen", () => {
    // Das ist der Fehlalarm, an dem die alte Erkennung litt: bei gleichem
    // Gewicht von 8 auf 10 zu gehen ist genau der Fortschritt, den die
    // Doppelprogression will — kein Grund für einen Deload.
    const hocharbeiten = [sets(3, 60, 8), sets(3, 60, 9), sets(3, 60, 10)];
    expect(stallCount(hocharbeiten, p)).toBe(0);
  });
});

describe("deloadTo", () => {
  it("nimmt rund zehn Prozent und landet auf einem ladbaren Wert", () => {
    expect(deloadTo(100, 2.5)).toBe(90);
  });

  it("geht einen Sprung runter, wenn die Rundung nichts reduziert hätte", () => {
    // 10 × 0,9 = 9 → auf 2,5er gerundet wieder 10. Ein Deload, der nichts
    // reduziert, ist keiner.
    expect(deloadTo(10, 2.5)).toBe(7.5);
  });

  it("fällt nie unter einen einzigen Sprung", () => {
    expect(deloadTo(2.5, 2.5)).toBe(2.5);
  });
});

describe("computeTargets — Deload", () => {
  const verfehlt = () => sets(3, 60, 7);

  it("hält das Gewicht, solange das Kontingent nicht aufgebraucht ist", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      history: [verfehlt(), verfehlt(), verfehlt()],
      bodyweight: 80,
    });
    expect(result.kind).toBe("hold");
    expect(result.targets[0].weight).toBe(60);
    expect(result.why).toContain("Nochmal");
  });

  it("geht nach drei verfehlten Einheiten in Folge zurück", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      // Vier Einträge: die erste Einheit ist das Rantasten und zählt nicht mit.
      history: [verfehlt(), verfehlt(), verfehlt(), verfehlt()],
      bodyweight: 80,
    });
    expect(result.kind).toBe("deload");
    expect(result.stalls).toBe(DELOAD_AFTER);
    // Vorgeschlagen, nicht vollzogen: das Gewicht bleibt stehen, bis jemand
    // den Knopf drückt.
    expect(result.deload).toBe(55);
    expect(result.targets[0].weight).toBe(60);
  });

  it("zählt eine erfolgreiche Einheit dazwischen als Neuanfang", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      history: [verfehlt(), verfehlt(), verfehlt(), sets(3, 60, 9), verfehlt()],
      bodyweight: 80,
    });
    expect(result.kind).toBe("hold");
    expect(result.stalls).toBe(1);
  });

  it("geht bei Eigengewicht nicht zurück — dort gibt es nichts wegzunehmen", () => {
    const result = computeTargets({
      exercise: pullup,
      planExercise: plan({ exerciseId: "pullup", repMin: 6, repMax: 10 }),
      history: Array.from({ length: 5 }, () =>
        sets(3, 0, 4).map((s) => ({ ...s, exerciseId: "pullup" }))
      ),
      bodyweight: 80,
    });
    expect(result.kind).toBe("hold");
    expect(result.targets.every((t) => t.weight === 0)).toBe(true);
  });
});

describe("computeTargets — Begründung", () => {
  it("liefert zu jedem Vorschlag einen Satz Klartext", () => {
    const faelle = [
      { history: [] as WorkoutSet[][], erwartet: "first" },
      { history: [sets(3, 60, 12)], erwartet: "up" },
      { history: [sets(3, 60, 9), sets(3, 60, 9)], erwartet: "hold" },
      {
        history: [sets(3, 60, 7), sets(3, 60, 7), sets(3, 60, 7), sets(3, 60, 7)],
        erwartet: "deload",
      },
    ];
    for (const fall of faelle) {
      const result = computeTargets({
        exercise: bench,
        planExercise: plan(),
        history: fall.history,
        bodyweight: 80,
      });
      expect(result.kind, JSON.stringify(fall.erwartet)).toBe(fall.erwartet);
      expect(result.why.length, result.kind).toBeGreaterThan(10);
      expect(/[.?]$/.test(result.why), result.why).toBe(true);
    }
  });
});


describe("computeTargets — erstes Rantasten", () => {
  it("wertet eine Rampe beim ersten Mal nicht als Fehlschlag", () => {
    // Genau der Fall aus dem echten Verlauf: 35 → 65 → 72,5 beim Latzug, weil
    // das Gewicht noch unbekannt war. Der Plan will drei Sätze; auf dem
    // schwersten stand nur einer.
    const rantasten = [
      set({ setIndex: 0, weight: 35, reps: 15 }),
      set({ setIndex: 1, weight: 65, reps: 10 }),
      set({ setIndex: 2, weight: 72.5, reps: 8 }),
    ];
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      history: [rantasten],
      bodyweight: 80,
    });
    expect(result.kind).toBe("first");
    expect(result.stalls).toBe(0);
    // Gefunden ist das Gewicht trotzdem — ab jetzt gilt der volle Plan darauf.
    expect(result.targets).toEqual([
      { weight: 72.5, reps: 8 },
      { weight: 72.5, reps: 8 },
      { weight: 72.5, reps: 8 },
    ]);
  });

  it("steigert auch beim ersten Mal, wenn die Vorgabe wirklich erfüllt war", () => {
    const result = computeTargets({
      exercise: bench,
      planExercise: plan(),
      history: [sets(3, 60, 12)],
      bodyweight: 80,
    });
    expect(result.kind).toBe("up");
  });
});
