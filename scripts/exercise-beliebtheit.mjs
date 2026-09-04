// Wie üblich eine Übung ist, als Stufe von 1 bis 5.
//
// Der Datensatz sagt darüber nichts, also wird die Stufe geschätzt — aus dem
// Gerät und aus dem Namen. Beides steht hier als lesbare Liste statt in einer
// Formel im Generator: die Zahlen sind Geschmack, und Geschmack gehört an eine
// Stelle, an der man ihn nachjustieren kann, ohne den Generator zu verstehen.
//
// Wofür das gut ist: die Bibliothek hat 1295 Übungen, und ein spürbarer Teil
// davon wird nie jemand anfassen — Gleichgewichtsbretter, Bauchroller, alles
// mit Gymnastikball. Sie zu löschen wäre falsch (jemand mag sie mögen), sie
// gleichberechtigt in die Trefferliste zu stellen aber auch: dann steht bei
// "Brust" ein Ball vor der Bank. Die Stufe sortiert und blendet aus, sie
// entfernt nichts.

/**
 * Der Ausgangswert je Gerät. Was in jedem Studio steht und in jedem Plan
 * vorkommt, fängt bei 4 an; Körpergewicht eine Stufe darunter, weil vieles
 * davon Turnübung ist und nicht Krafttraining; Band, Ball und Sonstiges unten.
 */
export const GERAET_STUFE = {
  barbell: 4,
  dumbbell: 4,
  machine: 4,
  cable: 4,
  bodyweight: 3,
  kettlebell: 2,
  // Band auf 2, nicht auf 1: mit 1 landete die gesamte Kategorie unter der
  // Sichtbarkeitsgrenze, und ein Gerätefilter, der nie einen Treffer hat, ist
  // kaputt und nicht streng. Von 2 aus erreicht ein Bank- oder Curl-Klassiker
  // am Band die 3, alles Übrige bleibt unten — und genau so ist es gemeint.
  band: 2,
  ball: 1,
  other: 1,
};

/**
 * Namen, die eine Übung zum Klassiker machen: +1. Bewusst am englischen
 * Original geprüft — die Namen im Katalog stehen im Original (siehe
 * public/uebungen/HERKUNFT.md), und Übersetzungen würden hier nur wackeln.
 */
export const KLASSIKER = [
  /bench press/,
  /chest press/,
  /\bfly\b|\bflye\b/,
  /squat/,
  /deadlift/,
  /\brow\b/,
  /pulldown/,
  /pull-?up|pullup|chin-?up|chinup/,
  /\bdip\b|\bdips\b/,
  /push-?up|pushup/,
  /shoulder press|overhead press|military press/,
  /lateral raise|front raise/,
  /\bcurl\b/,
  /pushdown|triceps extension|skull ?crusher/,
  /leg press|leg extension|leg curl/,
  /calf raise/,
  /hip thrust|glute bridge/,
  /lunge/,
  /\bshrug\b/,
  /face pull/,
  /crunch|\bplank\b|leg raise/,
];

/**
 * Namen, bei denen man im Studio weitergeht: −2. Das ist die Liste, die den
 * Ausschlag gibt — Gymnastikbälle, Gleichgewichtsbretter, Handtuchvarianten,
 * alles, was Gerät durch Behelf ersetzt.
 */
export const UNBELIEBT = [
  /stability ball|swiss ball|exercise ball|bosu|balance board/,
  /medicine ball/,
  /wheel|roller|rollout|rollerout/,
  /\btire\b|sledge|battling rope|battle rope/,
  /suspension|\btrx\b/,
  /\btowel\b|\bchair\b|\bwall\b/,
  /self assisted|partner|assisted.*by/,
  /jump rope|skipping/,
  /\bsled\b(?!.*leg press)/,
];

/**
 * Die Stufe einer Übung. Immer zwischen 1 und 5.
 *
 * Die Reihenfolge ist wichtig: UNBELIEBT deckelt, es zieht nicht bloß ab. Mit
 * einem Abzug hob der Klassiker-Bonus die Hälfte davon wieder auf, und
 * „Dumbbell Incline Fly On Exercise Ball" landete über der Sichtbarkeitsgrenze
 * — eine Kurzhantel plus das Wort „fly" reichten dafür. Eine Fliegende auf dem
 * Gymnastikball ist aber keine Fliegende mit Beiwerk, sondern eine andere
 * Übung, und zwar die, an der man vorbeigeht.
 */
export function beliebtheit({ name, equipment }) {
  const n = name.toLowerCase();
  if (UNBELIEBT.some((r) => r.test(n))) return 1;
  const stufe = (GERAET_STUFE[equipment] ?? 2) + (KLASSIKER.some((r) => r.test(n)) ? 1 : 0);
  return Math.max(1, Math.min(5, stufe));
}
