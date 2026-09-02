import type { Muscle } from "@/lib/training";

/**
 * Die fünf Farbflächen der App.
 *
 * Farbe ist hier Ordnung, nicht Schmuck: die Tönung einer Kachel sagt, worum
 * es geht, bevor man ein Wort gelesen hat. Damit das trägt, muss die Zuordnung
 * an einer Stelle stehen — verteilt man sie über die Seiten, bekommt dieselbe
 * Muskelgruppe auf der Startseite eine andere Farbe als in der Statistik, und
 * dann ist die Farbe wieder nur Dekoration.
 */
export type Tint = "violet" | "blue" | "orange" | "pink" | "mint";

export const TINTS: Tint[] = ["violet", "blue", "orange", "pink", "mint"];

/**
 * Zehn Muskelgruppen auf fünf Töne. Die Paare sind nicht beliebig, sondern
 * die Bewegungsfamilien, in denen ohnehin trainiert wird: Drücken, Ziehen,
 * Beine vorn, Beine hinten. Schultern und Rumpf bleiben als Paar übrig — beide
 * kommen in fast jeder Einheit vor und gehören zu keiner der vier Familien.
 */
export const MUSCLE_TINT: Record<Muscle, Tint> = {
  chest: "violet",
  triceps: "violet",
  back: "blue",
  biceps: "blue",
  quads: "orange",
  calves: "orange",
  hamstrings: "mint",
  glutes: "mint",
  shoulders: "pink",
  core: "pink",
};

/**
 * Klassenpaare, ausgeschrieben. Nicht aus Umständlichkeit: Tailwind liest die
 * Klassennamen aus dem Quelltext: `bg-tint-${tint}` stünde nirgends fertig da
 * und käme deshalb gar nicht erst im Stylesheet an.
 */
export const TINT_SURFACE: Record<Tint, string> = {
  violet: "bg-tint-violet text-tint-violet-ink",
  blue: "bg-tint-blue text-tint-blue-ink",
  orange: "bg-tint-orange text-tint-orange-ink",
  pink: "bg-tint-pink text-tint-pink-ink",
  mint: "bg-tint-mint text-tint-mint-ink",
};

/**
 * Die Familien als Strichfarbe. Für Kurven und Legenden: gleicher Farbton wie
 * die Fläche, aber gesättigt — zwei Pixel Pastell auf Weiß sieht niemand.
 */
export const TINT_LINE: Record<Tint, string> = {
  violet: "var(--tint-violet-line)",
  blue: "var(--tint-blue-line)",
  orange: "var(--tint-orange-line)",
  pink: "var(--tint-pink-line)",
  mint: "var(--tint-mint-line)",
};

/** Nur die Fläche, ohne Schriftfarbe — für Punkte, Balken und Legendenkästchen. */
export const TINT_FILL: Record<Tint, string> = {
  violet: "bg-tint-violet",
  blue: "bg-tint-blue",
  orange: "bg-tint-orange",
  pink: "bg-tint-pink",
  mint: "bg-tint-mint",
};

/**
 * Die Tönung einer Einheit: die des am häufigsten trainierten Muskels. Bei
 * Gleichstand gewinnt der zuerst genannte — welcher das ist, entscheidet die
 * Reihenfolge der Sätze und damit der Aufbau der Einheit selbst.
 *
 * Ohne Muskeln (leere Einheit, unbekannte Übung) bleibt es bei Violett: die
 * Leitfarbe ist die ehrlichste Antwort auf „weiß ich nicht".
 */
export function tintForMuscles(muscles: Iterable<Muscle>): Tint {
  const zaehler = new Map<Tint, number>();
  for (const muscle of muscles) {
    const tint = MUSCLE_TINT[muscle];
    if (tint) zaehler.set(tint, (zaehler.get(tint) ?? 0) + 1);
  }
  let beste: Tint = "violet";
  let hoechste = 0;
  for (const [tint, anzahl] of zaehler) {
    if (anzahl > hoechste) {
      hoechste = anzahl;
      beste = tint;
    }
  }
  return beste;
}

/**
 * Die Namen der fünf Familien. Für Legenden — „Drücken" sagt mehr als
 * „Violett", und wer eine Farbe einmal zugeordnet hat, liest sie danach ohne
 * Legende.
 */
export const TINT_FAMILY_LABEL: Record<Tint, string> = {
  violet: "Drücken",
  blue: "Ziehen",
  orange: "Beine vorn",
  mint: "Beine hinten",
  pink: "Schultern & Rumpf",
};

/**
 * Zustandsflächen.
 *
 * Farbe heißt in dieser App eigentlich „Muskelfamilie". Drinnen im Training
 * heißt sie etwas anderes: dort steht keine einzige Muskelkachel auf dem
 * Schirm, sondern eine Stunde lang nur diese eine Einheit — und dann muss die
 * Farbe sagen, was gerade los ist. Beides beißt sich nicht, weil es sich nie
 * begegnet. Ehrlicher, das hier hinzuschreiben, als so zu tun, als hätte das
 * System nur eine Regel.
 *
 * Was ausgewählt, aktiv oder heute ist, bekommt keine Tönung, sondern die
 * dunkle Füllung (`bg-primary`) — wie der heutige Tag in der Wochenleiste und
 * der aktive Reiter in der unteren Leiste.
 */
export const STATE_DONE = TINT_SURFACE.mint;
export const STATE_HINT = TINT_SURFACE.violet;
