import { roundToIncrement, type Exercise } from "@/lib/training";

/** Anteil des Arbeitsgewichts, mit dem der eine Aufwärmsatz gefahren wird. */
export const WARMUP_PERCENT = 0.55;
export const WARMUP_REPS = 8;

/**
 * Ab welchem Arbeitsgewicht die Automatik auch außerhalb der ersten Übung
 * einen Aufwärmsatz vorschlägt. Darunter lohnt die Rampe nicht.
 */
export const WARMUP_AUTO_THRESHOLD = 40;

/**
 * Was die Automatik tut, in einem Satz — für die Stelle unter der Auswahl.
 *
 * Steht hier, weil die Zahl darin dieselbe sein muss wie die, nach der
 * needsWarmup entscheidet. Vorher stand „ab 40 kg Arbeitsgewicht" zweimal als
 * getippter Text im Code: wer die Schwelle ändert, ändert dann die Regel, aber
 * nicht das, was die App über sie behauptet.
 */
export function warmupHinweis(kannZusatzgewicht: boolean, warmup: Exercise["warmup"]): string {
  if (!kannZusatzgewicht && warmup === "always") {
    return "Wirkt nur mit eingetragenem Zusatzgewicht — bei 0 kg gibt es nichts abzustufen.";
  }
  return `Automatisch: die erste Übung des Tages immer, sonst ab ${WARMUP_AUTO_THRESHOLD} kg Arbeitsgewicht.`;
}

/** Die Auswahl im Übungs-Editor und beim Anlegen einer eigenen Übung. */
export const WARMUP_OPTIONS: { value: Exercise["warmup"]; label: string }[] = [
  { value: null, label: "Automatisch" },
  { value: "always", label: "Immer" },
  { value: "never", label: "Nie" },
];

/**
 * Ob eine Übung einen Aufwärmsatz bekommt.
 *
 * exercise.warmup überschreibt die Automatik ('always'/'never'). Ohne
 * Übersteuerung entscheidet: die erste Übung des Tages bekommt immer eine
 * Rampe, danach nur ab einem Arbeitsgewicht — und nie bei Eigengewicht, wo es
 * kein Gewicht zum Abstufen gibt.
 */
export function needsWarmup({
  exercise,
  isFirst,
  weight,
}: {
  exercise: Exercise;
  isFirst: boolean;
  weight: number;
}): boolean {
  if (exercise.warmup === "always") return true;
  if (exercise.warmup === "never") return false;
  if (exercise.equipment === "bodyweight" || weight <= 0) return false;
  if (isFirst) return true;
  return weight >= WARMUP_AUTO_THRESHOLD;
}

/**
 * Gewicht des einen Aufwärmsatzes: 55 % des Arbeitsgewichts, auf den
 * Hantelsprung gerundet, mindestens ein Sprung. Landet die Rundung auf oder
 * über dem Arbeitsgewicht — bei sehr leichten Übungen möglich — gibt es
 * keinen sinnvollen Aufwärmsatz mehr, dann steht null.
 */
export function warmupWeight(weight: number, increment: number): number | null {
  if (weight <= 0) return null;
  const raw = roundToIncrement(weight * WARMUP_PERCENT, increment);
  const candidate = Math.max(increment, raw);
  if (candidate >= weight) return null;
  return candidate;
}
