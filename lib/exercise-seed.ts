import { LEGACY_EXERCISE_MAP } from "@/lib/exercise-legacy-map";

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
 * Die älteren Vorlagen nennen ihre Übungen weiterhin unter den Namen der alten
 * Bibliothek — lesbar und unverändert seit sie zusammengestellt wurden. Erst
 * hier werden sie auf die IDs des openGym-Katalogs aufgelöst. Neuere Vorlagen
 * geben die Katalog-ID direkt an; die geht unverändert durch.
 */
const e = (
  exerciseId: string,
  sets: number,
  repMin: number,
  repMax: number,
  rest: number
) => ({
  exerciseId: LEGACY_EXERCISE_MAP[exerciseId] ?? exerciseId,
  sets,
  repMin,
  repMax,
  rest,
});

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
          e("bankdruecken-lh", 3, 8, 12, 150),
          e("schraegbank-kh", 3, 8, 12, 120),
          e("schulterdruecken-kh", 3, 8, 12, 120),
          e("seitheben-kh", 3, 10, 15, 75),
          e("trizepsdruecken-seil", 3, 10, 15, 75),
          e("dips-trizeps", 3, 8, 12, 90),
        ],
      },
      {
        name: "Pull",
        exercises: [
          e("klimmzuege", 3, 6, 12, 150),
          e("langhantelrudern", 3, 8, 12, 150),
          e("latzug-breit", 3, 8, 12, 120),
          e("rudern-kabel", 3, 8, 12, 120),
          e("face-pulls", 3, 12, 15, 75),
          e("sz-curls", 3, 8, 12, 90),
        ],
      },
      {
        name: "Legs",
        exercises: [
          e("kniebeugen", 3, 8, 12, 180),
          e("rumaenisches-kreuzheben", 3, 8, 12, 150),
          e("beinpresse", 3, 10, 15, 120),
          e("beinbeuger-liegend", 3, 10, 15, 90),
          e("wadenheben-stehend", 3, 12, 20, 60),
          e("beinheben-haengend", 3, 10, 15, 60),
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
          e("bankdruecken-lh", 3, 6, 10, 150),
          e("langhantelrudern", 3, 6, 10, 150),
          e("schulterdruecken-kh", 3, 8, 12, 120),
          e("latzug-breit", 3, 8, 12, 120),
          e("sz-curls", 3, 8, 12, 90),
          e("trizepsdruecken-seil", 3, 10, 15, 75),
          e("seitheben-kh", 3, 12, 15, 60),
        ],
      },
      {
        name: "Lower",
        exercises: [
          e("kniebeugen", 3, 6, 10, 180),
          e("rumaenisches-kreuzheben", 3, 8, 12, 150),
          e("beinpresse", 3, 10, 15, 120),
          e("beinbeuger-sitzend", 3, 10, 15, 90),
          e("wadenheben-stehend", 3, 12, 20, 60),
          e("bauchmaschine", 3, 12, 15, 60),
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
          e("bankdruecken-lh", 3, 8, 12, 150),
          e("schraegbank-kh", 3, 8, 12, 120),
          e("fliegende-kh", 3, 10, 15, 75),
          e("klimmzuege", 3, 6, 12, 150),
          e("langhantelrudern", 3, 8, 12, 150),
          e("ueberzuege-kabel", 3, 10, 15, 75),
        ],
      },
      {
        name: "Schultern & Arme",
        exercises: [
          e("schulterdruecken-lh", 3, 8, 12, 150),
          e("seitheben-kh", 3, 12, 15, 60),
          e("vorgebeugtes-seitheben", 3, 12, 15, 60),
          e("sz-curls", 3, 8, 12, 90),
          e("hammercurls", 3, 10, 15, 75),
          e("french-press", 3, 8, 12, 90),
          e("trizepsdruecken-seil", 3, 10, 15, 75),
        ],
      },
      {
        name: "Beine",
        exercises: [
          e("kniebeugen", 3, 8, 12, 180),
          e("rumaenisches-kreuzheben", 3, 8, 12, 150),
          e("beinpresse", 3, 10, 15, 120),
          e("beinbeuger-liegend", 3, 10, 15, 90),
          e("wadenheben-stehend", 3, 12, 20, 60),
          e("wadenheben-sitzend", 3, 15, 20, 45),
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
          e("kniebeugen", 3, 8, 12, 180),
          e("bankdruecken-lh", 3, 8, 12, 150),
          e("langhantelrudern", 3, 8, 12, 150),
          e("schulterdruecken-kh", 3, 8, 12, 120),
          e("rumaenisches-kreuzheben", 3, 8, 12, 120),
          e("sz-curls", 3, 10, 15, 75),
          e("beinheben-haengend", 3, 10, 15, 60),
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
          e("og-1299", 3, 6, 10, 150), // Lever Incline Chest Press — obere Brust
          e("og-0576", 3, 6, 10, 150), // Lever Chest Press — steht doppelt im Katalog
          e("og-0596", 3, 12, 15, 75), // Lever Seated Fly
          e("og-0869", 3, 8, 12, 120), // Lever Shoulder Press V. 2
          e("og-0192", 3, 12, 15, 60), // Cable One Arm Lateral Raise
          e("og-0194", 3, 10, 15, 75), // Cable Overhead Triceps Extension (Rope Attachment)
          e("og-0200", 3, 12, 15, 60), // Cable Pushdown (With Rope Attachment)
          e("og-0739", 3, 8, 12, 150), // Sled 45° Leg Press
          e("og-0585", 3, 12, 15, 75), // Lever Leg Extension
          e("og-0605", 3, 12, 20, 60), // Lever Standing Calf Raise
          // Rotation aus dem Rumpf, leichtes Gewicht — der hohe Bereich hält die
          // Doppelprogression bei den Wiederholungen statt beim Gewicht.
          e("og-0243", 3, 12, 15, 45), // Cable Twist
        ],
      },
      {
        name: "Pull",
        exercises: [
          e("og-0150", 3, 6, 10, 150), // Cable Bar Lateral Pulldown
          // Zweimal dieselbe Maschine, zwei Griffbreiten: breit für die
          // Rückentiefe, eng für den Zug an den Rumpf.
          e("og-1350", 3, 6, 10, 150), // Lever Seated Row — breit fahren
          e("og-0588", 3, 8, 12, 120), // Lever Narrow Grip Seated Row — eng fahren
          // Überzüge am Kabel. Heißt im Katalog "Pushdown", ist aber die
          // Lat-Bewegung mit gestreckten Armen — nicht mit dem Trizeps-
          // Pushdown im Push-Tag verwechseln.
          e("og-0199", 3, 12, 15, 60), // Cable Pushdown (Straight Arm) V. 2
          e("og-0604", 3, 10, 15, 75), // Lever Shrug
          e("og-0602", 3, 12, 15, 60), // Lever Seated Reverse Fly
          e("og-0202", 3, 15, 20, 60), // Cable Rear Delt Row (Stirrups) — Face Pull
          e("og-0868", 3, 10, 15, 60), // Cable Curl
          e("og-0165", 3, 10, 15, 60), // Cable Hammer Curl (With Rope)
          e("og-0599", 3, 10, 15, 90), // Lever Seated Leg Curl
          e("og-0175", 3, 12, 15, 60), // Cable Kneeling Crunch
          e("og-0594", 3, 12, 20, 60), // Lever Seated Calf Raise
        ],
      },
    ],
  },
];

/** Push / Pull / Legs — der Plan, der per Migration beim Start angelegt wird. */
export const STARTER_PLAN = SPLIT_TEMPLATES[0];
