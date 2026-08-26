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
 * Die Vorlagen nennen ihre Übungen weiterhin unter den Namen der alten
 * Bibliothek — lesbar und unverändert seit sie zusammengestellt wurden. Erst
 * hier werden sie auf die IDs des openGym-Katalogs aufgelöst.
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

/** Fertige Splits zur Auswahl beim Anlegen eines Plans. */
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
          e("kniebeugen", 4, 8, 12, 180),
          e("rumaenisches-kreuzheben", 3, 8, 12, 150),
          e("beinpresse", 3, 10, 15, 120),
          e("beinbeuger-liegend", 3, 10, 15, 90),
          e("wadenheben-stehend", 4, 12, 20, 60),
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
          e("bankdruecken-lh", 4, 6, 10, 150),
          e("langhantelrudern", 4, 6, 10, 150),
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
          e("kniebeugen", 4, 6, 10, 180),
          e("rumaenisches-kreuzheben", 3, 8, 12, 150),
          e("beinpresse", 3, 10, 15, 120),
          e("beinbeuger-sitzend", 3, 10, 15, 90),
          e("wadenheben-stehend", 4, 12, 20, 60),
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
          e("bankdruecken-lh", 4, 8, 12, 150),
          e("schraegbank-kh", 3, 8, 12, 120),
          e("fliegende-kh", 3, 10, 15, 75),
          e("klimmzuege", 4, 6, 12, 150),
          e("langhantelrudern", 3, 8, 12, 150),
          e("ueberzuege-kabel", 3, 10, 15, 75),
        ],
      },
      {
        name: "Schultern & Arme",
        exercises: [
          e("schulterdruecken-lh", 4, 8, 12, 150),
          e("seitheben-kh", 4, 12, 15, 60),
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
          e("kniebeugen", 4, 8, 12, 180),
          e("rumaenisches-kreuzheben", 3, 8, 12, 150),
          e("beinpresse", 3, 10, 15, 120),
          e("beinbeuger-liegend", 3, 10, 15, 90),
          e("wadenheben-stehend", 4, 12, 20, 60),
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
          e("sz-curls", 2, 10, 15, 75),
          e("beinheben-haengend", 3, 10, 15, 60),
        ],
      },
    ],
  },
];

/** Push / Pull / Legs — der Plan, der per Migration beim Start angelegt wird. */
export const STARTER_PLAN = SPLIT_TEMPLATES[0];
