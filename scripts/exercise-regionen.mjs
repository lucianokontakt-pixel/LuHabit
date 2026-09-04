// Die Muskel-Untergruppe einer Übung — obere Brust, seitliche Schulter, Lat.
//
// Zehn Muskelgruppen sind für die Suche zu grob: "Schultern" wirft 143 Übungen
// aus, von denen die Hälfte eine ganz andere Bewegung ist. Vier der zehn
// Gruppen zerfallen sinnvoll weiter, die übrigen sechs sind selbst schon
// Untergruppen (Bizeps, Trizeps, Quadrizeps, Beinbeuger, Gesäß, Waden) und
// bleiben, wie sie sind.
//
// Zwei Quellen, in dieser Reihenfolge:
//
//  1. Der Datensatz selbst. Sein Feld `tg` trennt den Rücken bereits sauber in
//     lats / upper back / traps / spine — 203 Übungen, kein Rest. Das ist
//     echte Auskunft und schlägt jede Namensregel.
//
//  2. Namensmuster, wo der Datensatz schweigt. "pectorals" gilt dort für die
//     ganze Brust, aber "incline" und "decline" stehen im Namen und meinen
//     verlässlich obere bzw. untere Brust.
//
// Wo beides nichts hergibt, steht null: die Übung zeigt dann nur ihre
// Muskelgruppe. Das ist ehrlicher, als eine Region zu raten — "Barbell Thruster"
// ist keine Schulterübung mit Region, sondern eine Ganzkörperbewegung, die im
// Datensatz bei den Schultern gelandet ist.

/** Was `tg` direkt beantwortet. */
const AUS_TG = {
  lats: "lats",
  "upper back": "back-upper",
  traps: "traps",
  "levator scapulae": "traps",
  spine: "back-lower",
};

/**
 * Namensmuster je Muskelgruppe, der Reihe nach geprüft — das erste Muster, das
 * greift, gewinnt. Die Reihenfolge ist deshalb Absicht: "Reverse Fly" muss vor
 * "Fly" stehen, sonst wäre jede hintere Schulter eine vordere.
 */
const AUS_NAMEN = {
  chest: [
    ["chest-upper", /incline|low.to.high|\blandmine\b/],
    ["chest-lower", /decline|high.to.low/],
    // Alles Übrige ist die flache Bank und ihre Verwandtschaft — bei der Brust
    // ist der Rest also nicht "unbekannt", sondern die Mitte.
    ["chest-mid", /./],
  ],
  shoulders: [
    ["delts-rear", /rear|reverse fly|reverse pec|bent.?over lateral|face pull|external rotation/],
    ["delts-side", /lateral raise|side lateral|lateral rise|upright row|\bshoulder abduction\b/],
    ["delts-front", /front raise|forward raise|press|overhead|military|\bshoulder flexion\b/],
  ],
  core: [
    ["obliques", /oblique|twist|side bend|side crunch|side plank|woodchop|russian|windshield|\bside\b.*(bend|raise)/],
    ["abs", /./],
  ],
};

/**
 * Die Region einer Übung, oder null.
 *
 * @param tg    Zielmuskel des Datensatzes, vor der Zusammenlegung
 * @param name  englischer Originalname
 * @param muscle LuHabits Muskelgruppe, in die die Übung fällt
 */
export function region({ tg, name, muscle }) {
  const direkt = AUS_TG[tg];
  if (direkt) return direkt;

  const muster = AUS_NAMEN[muscle];
  if (!muster) return null;

  const n = name.toLowerCase();
  for (const [key, regex] of muster) {
    if (regex.test(n)) return key;
  }
  return null;
}
