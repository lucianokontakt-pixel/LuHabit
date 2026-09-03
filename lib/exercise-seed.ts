
export type SplitDay = {
  name: string;
  exercises: { exerciseId: string; sets: number; repMin: number; repMax: number; rest: number }[];
};

export type SplitTemplate = {
  id: string;
  name: string;
  /** Empfohlene Einheiten pro Woche — wird als Wochenziel des Plans übernommen. */
  weeklyTarget: number;
  description: string;
  days: SplitDay[];
};

/**
 * Kurzform für eine Zeile im Plan.
 *
 * Die Vorlagen nannten ihre Übungen lange unter den Namen der ersten,
 * selbst gepflegten Bibliothek („bankdruecken-lh") und lösten sie über eine
 * Tabelle auf. Seit die Katalog-IDs mit RepDB selbst lesbar sind
 * („bench-press"), steht die Übung direkt da — eine Auflösungsschicht weniger,
 * und man sieht beim Lesen der Vorlage, was drinsteht.
 */
const e = (
  exerciseId: string,
  sets: number,
  repMin: number,
  repMax: number,
  rest: number
) => ({ exerciseId, sets, repMin, repMax, rest });

/**
 * Fertige Splits zur Auswahl beim Anlegen eines Plans.
 *
 * Überall drei Arbeitssätze. Vorher standen 2, 3 und 4 gemischt — vier für die
 * schweren Grundübungen, zwei für die Isolation —, und das las sich im Plan wie
 * eine Aussage über die Übung, war aber nur eine Gewohnheit. Eine feste Zahl
 * macht den Plan vergleichbar: was sich zwischen zwei Übungen unterscheidet,
 * sind Wiederholungsbereich und Pause, und die stehen daneben.
 *
 * Der Aufwärmsatz zählt hier nicht mit. Er steckt in keiner dieser Zahlen,
 * sondern wird erst in der Einheit vorangestellt (siehe lib/warmup.ts) und
 * bleibt aus jeder Kennzahl heraus.
 */
export const SPLIT_TEMPLATES: SplitTemplate[] = [
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    weeklyTarget: 3,
    description: "Drücken, Ziehen, Beine. Der Klassiker — funktioniert bei 3× wie bei 6× die Woche.",
    days: [
      {
        name: "Push",
        exercises: [
          e("bench-press", 3, 8, 12, 150),
          e("incline-db-press", 3, 8, 12, 120),
          e("seated-db-press", 3, 8, 12, 120),
          e("lateral-raise", 3, 10, 15, 75),
          e("tricep-pushdown", 3, 10, 15, 75),
          e("bench-dips", 3, 8, 12, 90),
        ],
      },
      {
        name: "Pull",
        exercises: [
          e("pull-up", 3, 6, 12, 150),
          e("barbell-row", 3, 8, 12, 150),
          e("lat-pulldown", 3, 8, 12, 120),
          e("seated-cable-row", 3, 8, 12, 120),
          e("face-pull", 3, 12, 15, 75),
          e("ez-bar-curl", 3, 8, 12, 90),
        ],
      },
      {
        name: "Legs",
        exercises: [
          e("squat", 3, 8, 12, 180),
          e("romanian-deadlift", 3, 8, 12, 150),
          e("leg-press", 3, 10, 15, 120),
          e("leg-curl", 3, 10, 15, 90),
          e("standing-calf-raise", 3, 12, 20, 60),
          e("hanging-leg-raise", 3, 10, 15, 60),
        ],
      },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    weeklyTarget: 4,
    description: "Oberkörper und Unterkörper im Wechsel. Ausgelegt auf 4× die Woche.",
    days: [
      {
        name: "Upper",
        exercises: [
          e("bench-press", 3, 6, 10, 150),
          e("barbell-row", 3, 6, 10, 150),
          e("seated-db-press", 3, 8, 12, 120),
          e("lat-pulldown", 3, 8, 12, 120),
          e("ez-bar-curl", 3, 8, 12, 90),
          e("tricep-pushdown", 3, 10, 15, 75),
          e("lateral-raise", 3, 12, 15, 60),
        ],
      },
      {
        name: "Lower",
        exercises: [
          e("squat", 3, 6, 10, 180),
          e("romanian-deadlift", 3, 8, 12, 150),
          e("leg-press", 3, 10, 15, 120),
          e("seated-leg-curl", 3, 10, 15, 90),
          e("standing-calf-raise", 3, 12, 20, 60),
          e("machine-seated-crunch", 3, 12, 15, 60),
        ],
      },
    ],
  },
  {
    id: "arnold",
    name: "Arnold Split",
    weeklyTarget: 6,
    description:
      "Brust+Rücken, Schultern+Arme, Beine — jeder Tag zweimal pro Woche. Hohes Volumen, 6 Einheiten.",
    days: [
      {
        name: "Brust & Rücken",
        exercises: [
          e("bench-press", 3, 8, 12, 150),
          e("incline-db-press", 3, 8, 12, 120),
          e("db-fly", 3, 10, 15, 75),
          e("pull-up", 3, 6, 12, 150),
          e("barbell-row", 3, 8, 12, 150),
          e("straight-arm-pulldown", 3, 10, 15, 75),
        ],
      },
      {
        name: "Schultern & Arme",
        exercises: [
          e("ohp", 3, 8, 12, 150),
          e("lateral-raise", 3, 12, 15, 60),
          e("rear-delt-fly", 3, 12, 15, 60),
          e("ez-bar-curl", 3, 8, 12, 90),
          e("hammer-curl", 3, 10, 15, 75),
          e("ez-bar-overhead-extension", 3, 8, 12, 90),
          e("tricep-pushdown", 3, 10, 15, 75),
        ],
      },
      {
        name: "Beine",
        exercises: [
          e("squat", 3, 8, 12, 180),
          e("romanian-deadlift", 3, 8, 12, 150),
          e("leg-press", 3, 10, 15, 120),
          e("leg-curl", 3, 10, 15, 90),
          e("standing-calf-raise", 3, 12, 20, 60),
          e("seated-calf-raise", 3, 15, 20, 45),
        ],
      },
    ],
  },
  {
    id: "fullbody",
    name: "Ganzkörper",
    weeklyTarget: 3,
    description: "Ein Tag, alles drin, 3× die Woche wiederholt. Gut bei wenig Zeit.",
    days: [
      {
        name: "Ganzkörper",
        exercises: [
          e("squat", 3, 8, 12, 180),
          e("bench-press", 3, 8, 12, 150),
          e("barbell-row", 3, 8, 12, 150),
          e("seated-db-press", 3, 8, 12, 120),
          e("romanian-deadlift", 3, 8, 12, 120),
          e("ez-bar-curl", 3, 10, 15, 75),
          e("hanging-leg-raise", 3, 10, 15, 60),
        ],
      },
    ],
  },
  {
    id: "push-pull-maschinen",
    name: "Push / Pull an Maschinen",
    weeklyTarget: 4,
    description:
      "Zwei feste Einheiten im Wechsel, nur Maschinen und Kabel. Oberkörper führt, Beine laufen mit.",
    days: [
      {
        // Reihenfolge ist Absicht: schwere Maschinen zuerst, danach Isolation,
        // Beine und Bauch zum Schluss. Feste Plätze, keine Rotation innerhalb
        // des Tages.
        name: "Push",
        exercises: [
          e("incline-bench-press", 3, 6, 10, 150), // Lever Incline Chest Press — obere Brust
          e("chest-press-machine", 3, 6, 10, 150), // Lever Chest Press — steht doppelt im Katalog
          e("machine-chest-fly", 3, 12, 15, 75), // Lever Seated Fly
          e("machine-shoulder-press", 3, 8, 12, 120), // Lever Shoulder Press V. 2
          e("cable-lateral-raise", 3, 12, 15, 60), // Cable One Arm Lateral Raise
          e("overhead-tricep-extension", 3, 10, 15, 75), // Cable Overhead Triceps Extension (Rope Attachment)
          e("tricep-pushdown", 3, 12, 15, 60), // Cable Pushdown (With Rope Attachment)
          e("leg-press", 3, 8, 12, 150), // Sled 45° Leg Press
          e("leg-extension", 3, 12, 15, 75), // Lever Leg Extension
          e("standing-calf-raise", 3, 12, 20, 60), // Lever Standing Calf Raise
          // Rotation aus dem Rumpf, leichtes Gewicht — der hohe Bereich hält die
          // Doppelprogression bei den Wiederholungen statt beim Gewicht.
          e("russian-twist", 3, 12, 15, 45), // Cable Twist
        ],
      },
      {
        name: "Pull",
        exercises: [
          e("lat-pulldown", 3, 6, 10, 150), // Cable Bar Lateral Pulldown
          // Zweimal dieselbe Maschine, zwei Griffbreiten: breit für die
          // Rückentiefe, eng für den Zug an den Rumpf.
          e("seated-cable-row", 3, 6, 10, 150), // Lever Seated Row — breit fahren
          e("wide-grip-seated-cable-row", 3, 8, 12, 120), // Lever Narrow Grip Seated Row — eng fahren
          // Überzüge am Kabel. Heißt im Katalog "Pushdown", ist aber die
          // Lat-Bewegung mit gestreckten Armen — nicht mit dem Trizeps-
          // Pushdown im Push-Tag verwechseln.
          e("straight-arm-pulldown", 3, 12, 15, 60), // Cable Pushdown (Straight Arm) V. 2
          e("plate-loaded-shrug", 3, 10, 15, 75), // Lever Shrug
          e("dumbbell-reverse-fly", 3, 12, 15, 60), // Lever Seated Reverse Fly
          e("face-pull", 3, 15, 20, 60), // Cable Rear Delt Row (Stirrups) — Face Pull
          e("cable-curl", 3, 10, 15, 60), // Cable Curl
          e("cable-hammer-curl", 3, 10, 15, 60), // Cable Hammer Curl (With Rope)
          e("seated-leg-curl", 3, 10, 15, 90), // Lever Seated Leg Curl
          e("cable-crunch", 3, 12, 15, 60), // Cable Kneeling Crunch
          e("seated-calf-raise", 3, 12, 20, 60), // Lever Seated Calf Raise
        ],
      },
    ],
  },
];

/** Push / Pull / Legs — der Plan, der per Migration beim Start angelegt wird. */
export const STARTER_PLAN = SPLIT_TEMPLATES[0];
