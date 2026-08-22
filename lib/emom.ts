/** Ein Schritt der Sequenz: wie lange, und was in dieser Zeit ansteht. */
export type EmomStep = {
  seconds: number;
  /** Zielwiederholungen für diesen Schritt. null heißt: keine Vorgabe. */
  reps: number | null;
  /** Was zu tun ist ("Burpees"). Leer erlaubt — dann zählt nur die Zeit. */
  label: string;
};

export type EmomTemplate = {
  id: string;
  name: string;
  /** Countdown vor der ersten Runde. 0 heißt: kein Countdown, sofort los. */
  prepareSeconds: number;
  /** Wie oft die Schritt-Sequenz durchlaufen wird. */
  rounds: number;
  steps: EmomStep[];
  /**
   * Ruhezeit nach jeder Übung — auch zwischen Schritten innerhalb einer
   * Runde, nicht nur am Rundenende. Eine Übung selbst hat keine Pause, die
   * steht immer zwischen zwei Übungen; die Rundengrenze ist dabei keine
   * Ausnahme. 0 heißt: keine Pause, die nächste Übung beginnt direkt.
   */
  restSeconds: number;
  position: number;
};

/** Ein Abschnitt im ausgerollten Durchgang — entweder ein Schritt oder eine Pause. */
export type EmomSegment = {
  /** 0-basiert über den gesamten Durchgang, Arbeit und Pausen mitgezählt. */
  index: number;
  /** 1-basiert: der wievielte Durchlauf der Sequenz. */
  round: number;
  /**
   * 0-basiert: welcher Schritt innerhalb der Runde. Bei "rest" der Schritt,
   * nach dem die Pause kommt — nicht der, der als Nächstes ansteht.
   */
  stepIndex: number;
  kind: "work" | "rest";
  label: string;
  reps: number | null;
  seconds: number;
  /** Sekunden seit Ende der Vorbereitung. */
  startsAt: number;
  endsAt: number;
};

export const MIN_STEP_SECONDS = 5;
export const MAX_STEP_SECONDS = 3600;
export const MAX_STEP_REPS = 999;
export const MAX_ROUNDS = 99;
export const MAX_PREPARE_SECONDS = 300;
export const MAX_REST_SECONDS = 600;

/** Ab wann die Countdown-Töne laufen: die letzten drei Sekunden eines Abschnitts. */
export const COUNTDOWN_FROM = 3;

export const DEFAULT_TEMPLATE: Omit<EmomTemplate, "id" | "position"> = {
  name: "EMOM",
  prepareSeconds: 10,
  rounds: 10,
  steps: [{ seconds: 60, reps: null, label: "" }],
  restSeconds: 0,
};

/**
 * Die Sequenz auf alle Runden ausgerollt, samt Pausen nach jeder Übung.
 *
 * Aus 2 Schritten × 5 Runden werden 10 Arbeits-Segmente, die abwechselnd auf
 * die Schritte zeigen; ist restSeconds gesetzt, steht nach jedem einzelnen
 * Arbeits-Segment ein Pausen-Segment — auch zwischen den Schritten innerhalb
 * einer Runde, nicht nur am Rundenende. Nur nach dem allerletzten Schritt der
 * allerletzten Runde nicht mehr, dort gibt es nichts mehr, worauf sich die
 * Pause vorbereiten würde. Der Timer fragt nur noch, in welchem Segment er
 * gerade steckt — die gesamte Ablauflogik steckt vollständig hier drin.
 */
export function buildSegments(template: EmomTemplate): EmomSegment[] {
  const steps = template.steps.filter((s) => s.seconds > 0);
  if (steps.length === 0 || template.rounds <= 0) return [];

  const rest = Math.max(0, template.restSeconds);
  const segments: EmomSegment[] = [];
  let cursor = 0;
  let index = 0;

  for (let round = 1; round <= template.rounds; round++) {
    for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
      const step = steps[stepIndex];
      segments.push({
        index,
        round,
        stepIndex,
        kind: "work",
        label: step.label,
        reps: step.reps,
        seconds: step.seconds,
        startsAt: cursor,
        endsAt: cursor + step.seconds,
      });
      cursor += step.seconds;
      index++;

      const isVeryLastStep = round === template.rounds && stepIndex === steps.length - 1;
      if (rest > 0 && !isVeryLastStep) {
        segments.push({
          index,
          round,
          stepIndex,
          kind: "rest",
          label: "",
          reps: null,
          seconds: rest,
          startsAt: cursor,
          endsAt: cursor + rest,
        });
        cursor += rest;
        index++;
      }
    }
  }

  return segments;
}

/** Gesamtdauer inklusive Vorbereitung und aller Pausen, in Sekunden. */
export function totalDuration(
  template: EmomTemplate,
  segments = buildSegments(template)
): number {
  const work = segments.length > 0 ? segments[segments.length - 1].endsAt : 0;
  return Math.max(0, template.prepareSeconds) + work;
}

export type EmomPhase =
  | { kind: "prepare"; remaining: number; total: number }
  | {
      kind: "work";
      segment: EmomSegment;
      remaining: number;
      /** Der nächste Abschnitt, falls es einen gibt — für die Vorschau. */
      next: EmomSegment | null;
    }
  | { kind: "done"; total: number };

/**
 * Welche Phase bei einer verstrichenen Zeit gilt.
 *
 * Rein aus der Wanduhr-Differenz gerechnet statt aus gezählten Ticks: schläft
 * das Handy zwischendurch oder drosselt der Browser den Timer im Hintergrund,
 * stimmt der Abschnitt beim Zurückkehren trotzdem.
 */
export function phaseAt(
  template: EmomTemplate,
  elapsed: number,
  segments = buildSegments(template)
): EmomPhase {
  const prepare = Math.max(0, template.prepareSeconds);
  const total = totalDuration(template, segments);

  if (segments.length === 0) return { kind: "done", total };

  if (elapsed < prepare) {
    return { kind: "prepare", remaining: prepare - elapsed, total: prepare };
  }

  const workElapsed = elapsed - prepare;
  const last = segments[segments.length - 1];
  if (workElapsed >= last.endsAt) return { kind: "done", total };

  // Lineare Suche: die Segmentliste ist kurz (Runden × Schritte), und ein
  // Binärsuch-Index wäre hier mehr Code als Gewinn.
  const segment = segments.find((s) => workElapsed < s.endsAt) ?? last;

  return {
    kind: "work",
    segment,
    remaining: segment.endsAt - workElapsed,
    next: segments[segment.index + 1] ?? null,
  };
}

/**
 * Der verstrichene Zeitpunkt, an dem eine bestimmte Runde beginnt — für die
 * Rundennavigation. Runde ≤ 1 ist der Start (Ende der Vorbereitung), Runde
 * über der letzten ist das Ende des gesamten Durchgangs.
 */
export function roundStartElapsed(
  template: EmomTemplate,
  round: number,
  segments = buildSegments(template)
): number {
  const prepare = Math.max(0, template.prepareSeconds);
  if (round <= 1 || segments.length === 0) return prepare;
  if (round > template.rounds) return totalDuration(template, segments);

  const first = segments.find((s) => s.round === round && s.kind === "work" && s.stepIndex === 0);
  return first ? prepare + first.startsAt : prepare;
}

/**
 * Der verstrichene Zeitpunkt, an dem der aktuelle Abschnitt endet — zum
 * Überspringen. Während der Vorbereitung ist das ihr Ende, im letzten
 * Abschnitt das Ende des gesamten Durchgangs.
 */
export function nextBoundaryElapsed(
  template: EmomTemplate,
  elapsed: number,
  segments = buildSegments(template)
): number {
  const prepare = Math.max(0, template.prepareSeconds);
  if (segments.length === 0) return 0;
  if (elapsed < prepare) return prepare;

  const workElapsed = elapsed - prepare;
  const last = segments[segments.length - 1];
  if (workElapsed >= last.endsAt) return totalDuration(template, segments);

  const segment = segments.find((s) => workElapsed < s.endsAt) ?? last;
  return prepare + segment.endsAt;
}

/**
 * Beschriftung einer Vorlage in der Liste: "10 × 60s" beim klassischen EMOM.
 *
 * Mehrere Schritte werden immer einzeln aufgezählt — auch wenn sie gleich lang
 * sind. Ein zusammengefasstes "3 × 10s" für zwei Zehn-Sekunden-Schritte läse
 * sich wie eine halb so lange Vorlage.
 */
export function describeTemplate(template: EmomTemplate): string {
  const steps = template.steps.filter((s) => s.seconds > 0);
  if (steps.length === 0) return "Keine Schritte";

  const base =
    steps.length === 1
      ? `${template.rounds} × ${steps[0].seconds}s`
      : `${template.rounds} × (${steps.map((s) => `${s.seconds}s`).join(" + ")})`;

  return template.restSeconds > 0 ? `${base} · Pause ${template.restSeconds}s` : base;
}

/** mm:ss — der Timer zeigt auch bei langen Vorlagen keine Stunden an. */
export function formatSeconds(value: number): string {
  const total = Math.max(0, Math.ceil(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
