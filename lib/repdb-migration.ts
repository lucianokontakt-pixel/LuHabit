/**
 * Welche alte Übung welche neue wird.
 *
 * Beim ersten Anlauf im August wurden alle 1295 Einträge automatisch gepaart —
 * mit Namensähnlichkeit, Kollisionen und einem UNIQUE-Fehler beim Migrieren.
 * Der zweite Anlauf beginnt woanders: in Plänen und Verlauf stecken nur 40
 * verschiedene IDs. Vierzig kann man einzeln ansehen, und genau das ist hier
 * passiert — jede Zeile ist ein Urteil, keine Rechnung.
 *
 * `null` heißt: RepDB hat dafür kein ehrliches Gegenstück. Die Übung bleibt
 * dann als eigene Übung bestehen, mit ihrem Namen und ihrem ganzen Verlauf.
 * Das ist der wichtigere Teil der Regel — ein „passt ungefähr" schreibt eine
 * falsche Bewegung in die Statistik, und eine Kollision hätte den Verlauf
 * zweier Übungen vermischt.
 *
 * Kollisionen sind ausgeschlossen: keine zwei alten IDs zeigen auf dieselbe
 * neue (siehe lib/exercise-catalog.test.ts). Wo zwei sich um dasselbe Ziel
 * bewarben, hat die mit dem längeren Verlauf es bekommen.
 */
export const REPDB_MIGRATION: Record<string, string | null> = {
  // — eindeutig, gleiche Bewegung, gleiches Gerät —
  "og-0025": "bench-press", // Barbell Bench Press
  "og-0027": "barbell-row", // Barbell Bent Over Row
  "og-0043": "squat", // Barbell Full Squat
  "og-0085": "romanian-deadlift", // Barbell Romanian Deadlift
  "og-0150": "lat-pulldown", // Cable Bar Lateral Pulldown
  "og-0165": "cable-hammer-curl", // Cable Hammer Curl (With Rope)
  "og-0175": "cable-crunch", // Cable Kneeling Crunch — der Kabelcrunch wird kniend ausgeführt
  "og-0192": "cable-lateral-raise", // Cable One Arm Lateral Raise
  "og-0199": "straight-arm-pulldown", // Cable Pushdown (Straight Arm) V. 2
  "og-0200": "tricep-pushdown", // Cable Pushdown (With Rope Attachment)
  "og-0314": "incline-db-press", // Dumbbell Incline Bench Press
  "og-0334": "lateral-raise", // Dumbbell Lateral Raise
  "og-0405": "seated-db-press", // Dumbbell Seated Shoulder Press
  "og-0447": "ez-bar-curl", // Ez Barbell Curl
  "og-0472": "hanging-leg-raise", // Hanging Leg Raise
  "og-0573": "machine-back-extension", // Lever Back Extension
  "og-0576": "chest-press-machine", // Lever Chest Press
  "og-0585": "leg-extension", // Lever Leg Extension
  "og-0586": "leg-curl", // Lever Lying Leg Curl
  "og-0594": "seated-calf-raise", // Lever Seated Calf Raise
  "og-0596": "machine-chest-fly", // Lever Seated Fly
  "og-0599": "seated-leg-curl", // Lever Seated Leg Curl
  "og-0604": "plate-loaded-shrug", // Lever Shrug
  "og-0605": "standing-calf-raise", // Lever Standing Calf Raise
  "og-0652": "pull-up", // Pull-Up
  "og-0739": "leg-press", // Sled 45° Leg Press
  "og-0868": "cable-curl", // Cable Curl
  "og-0869": "machine-shoulder-press", // Lever Shoulder Press V. 2
  "og-1350": "seated-cable-row", // Lever Seated Row
  "og-1452": "machine-seated-crunch", // Lever Seated Crunch

  // — naheliegend, aber nicht dasselbe Gerät; bewusst trotzdem gepaart —
  // Das Rudern am Kabelzug ist dieselbe Bewegung wie an der Rudermaschine,
  // RepDB führt sie nur unter dem Kabelzug.
  "og-0202": "face-pull", // Cable Rear Delt Row (Stirrups) → Kabel-Face-Pull
  "og-0814": "bench-dips", // Triceps Dip — beide Eigengewicht auf den Trizeps

  // — kein Gegenstück: bleibt eigene Übung samt Verlauf —
  // Eine Schrägbank-Brustpresse als Maschine gibt es bei RepDB nicht, und die
  // flache (chest-press-machine) ist schon vergeben.
  "og-1299": null, // Lever Incline Chest Press
  // RepDB kennt nur Kabel-Rudern, kein enges Maschinenrudern.
  "og-0588": null, // Lever Narrow Grip Seated Row
  // Dieselbe Bewegung wie og-1350, das das Ziel bekommen hat.
  "og-0861": null, // Cable Seated Row
  // Es gibt kein zweites Rear-Delt-Rudern am Kabel.
  "og-0203": null, // Cable Rear Delt Row (With Rope)
  // Reverse Fly gibt es nur mit Kurzhantel, nicht an der Maschine.
  "og-0602": null, // Lever Seated Reverse Fly
  // Überkopf-Trizepsdrücken gibt es nur mit Hantel, nicht am Kabel — und am
  // Seil hängen andere Gewichte als an einer Kurzhantel.
  "og-0194": null, // Cable Overhead Triceps Extension (Rope Attachment)
  // Für die Rotation am Kabel hat RepDB nur die Pallof-Press, und die hält
  // gegen die Drehung, statt sie auszuführen.
  "og-0243": null, // Cable Twist
  // "Cable Pulldown" ohne nähere Angabe; der Latzug ist an og-0150 vergeben.
  "og-0198": null, // Cable Pulldown
};
