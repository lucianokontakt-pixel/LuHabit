import type { Equipment, Muscle } from "@/lib/training";

export type SeedExercise = {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  /** Startgewicht-Vorschlag = Körpergewicht × Faktor (null = kein Vorschlag). */
  factor: number | null;
};

/**
 * Grundbestand der Übungsbibliothek. Faktoren zielen auf ein Arbeitsgewicht
 * für rund 10 saubere Wiederholungen; Kurzhantel-Faktoren gelten je Hantel.
 */
export const SEED_EXERCISES: SeedExercise[] = [
  // Brust
  { id: "bankdruecken-lh", name: "Bankdrücken (Langhantel)", muscle: "chest", equipment: "barbell", factor: 0.6 },
  { id: "schraegbank-lh", name: "Schrägbankdrücken (Langhantel)", muscle: "chest", equipment: "barbell", factor: 0.5 },
  { id: "negativbank-lh", name: "Negativbankdrücken (Langhantel)", muscle: "chest", equipment: "barbell", factor: 0.55 },
  { id: "bankdruecken-kh", name: "Bankdrücken (Kurzhantel)", muscle: "chest", equipment: "dumbbell", factor: 0.22 },
  { id: "schraegbank-kh", name: "Schrägbankdrücken (Kurzhantel)", muscle: "chest", equipment: "dumbbell", factor: 0.18 },
  { id: "fliegende-kh", name: "Fliegende (Kurzhantel)", muscle: "chest", equipment: "dumbbell", factor: 0.1 },
  { id: "schraegbank-fliegende", name: "Schrägbank-Fliegende", muscle: "chest", equipment: "dumbbell", factor: 0.09 },
  { id: "butterfly", name: "Butterfly (Maschine)", muscle: "chest", equipment: "machine", factor: 0.35 },
  { id: "brustpresse", name: "Brustpresse (Maschine)", muscle: "chest", equipment: "machine", factor: 0.5 },
  { id: "kabelzug-fliegende", name: "Kabelzug-Fliegende", muscle: "chest", equipment: "cable", factor: 0.12 },
  { id: "dips-brust", name: "Dips (brustbetont)", muscle: "chest", equipment: "bodyweight", factor: null },
  { id: "liegestuetze", name: "Liegestütze", muscle: "chest", equipment: "bodyweight", factor: null },
  { id: "schraegbank-multipresse", name: "Schrägbankdrücken (Multipresse)", muscle: "chest", equipment: "machine", factor: 0.45 },

  // Rücken
  { id: "kreuzheben", name: "Kreuzheben", muscle: "back", equipment: "barbell", factor: 1.0 },
  { id: "rack-pulls", name: "Rack Pulls", muscle: "back", equipment: "barbell", factor: 1.1 },
  { id: "langhantelrudern", name: "Langhantelrudern", muscle: "back", equipment: "barbell", factor: 0.5 },
  { id: "t-bar-rudern", name: "T-Bar-Rudern", muscle: "back", equipment: "barbell", factor: 0.45 },
  { id: "kurzhantelrudern", name: "Kurzhantelrudern (einarmig)", muscle: "back", equipment: "dumbbell", factor: 0.25 },
  { id: "klimmzuege", name: "Klimmzüge", muscle: "back", equipment: "bodyweight", factor: null },
  { id: "latzug-breit", name: "Latzug (breit)", muscle: "back", equipment: "cable", factor: 0.55 },
  { id: "latzug-eng", name: "Latzug (eng, Untergriff)", muscle: "back", equipment: "cable", factor: 0.55 },
  { id: "rudern-kabel", name: "Rudern am Kabel (sitzend)", muscle: "back", equipment: "cable", factor: 0.55 },
  { id: "rudermaschine", name: "Rudermaschine", muscle: "back", equipment: "machine", factor: 0.55 },
  { id: "ueberzuege-kabel", name: "Überzüge (Kabel)", muscle: "back", equipment: "cable", factor: 0.3 },
  { id: "hyperextensions", name: "Hyperextensions", muscle: "back", equipment: "bodyweight", factor: null },
  { id: "shrugs-kh", name: "Shrugs (Kurzhantel)", muscle: "back", equipment: "dumbbell", factor: 0.3 },
  { id: "shrugs-lh", name: "Shrugs (Langhantel)", muscle: "back", equipment: "barbell", factor: 0.5 },

  // Schultern
  { id: "schulterdruecken-lh", name: "Schulterdrücken (Langhantel)", muscle: "shoulders", equipment: "barbell", factor: 0.4 },
  { id: "schulterdruecken-kh", name: "Schulterdrücken (Kurzhantel)", muscle: "shoulders", equipment: "dumbbell", factor: 0.15 },
  { id: "schulterpresse-maschine", name: "Schulterpresse (Maschine)", muscle: "shoulders", equipment: "machine", factor: 0.4 },
  { id: "arnold-press", name: "Arnold Press", muscle: "shoulders", equipment: "dumbbell", factor: 0.14 },
  { id: "seitheben-kh", name: "Seitheben (Kurzhantel)", muscle: "shoulders", equipment: "dumbbell", factor: 0.08 },
  { id: "seitheben-kabel", name: "Seitheben (Kabel)", muscle: "shoulders", equipment: "cable", factor: 0.08 },
  { id: "frontheben-kh", name: "Frontheben (Kurzhantel)", muscle: "shoulders", equipment: "dumbbell", factor: 0.08 },
  { id: "vorgebeugtes-seitheben", name: "Vorgebeugtes Seitheben", muscle: "shoulders", equipment: "dumbbell", factor: 0.07 },
  { id: "reverse-butterfly", name: "Reverse Butterfly", muscle: "shoulders", equipment: "machine", factor: 0.25 },
  { id: "face-pulls", name: "Face Pulls", muscle: "shoulders", equipment: "cable", factor: 0.25 },
  { id: "aufrechtes-rudern", name: "Aufrechtes Rudern", muscle: "shoulders", equipment: "barbell", factor: 0.3 },

  // Bizeps
  { id: "langhantelcurls", name: "Langhantel-Curls", muscle: "biceps", equipment: "barbell", factor: 0.3 },
  { id: "sz-curls", name: "SZ-Curls", muscle: "biceps", equipment: "barbell", factor: 0.28 },
  { id: "kurzhantelcurls", name: "Kurzhantel-Curls", muscle: "biceps", equipment: "dumbbell", factor: 0.12 },
  { id: "hammercurls", name: "Hammercurls", muscle: "biceps", equipment: "dumbbell", factor: 0.13 },
  { id: "scottcurls", name: "Scott-Curls", muscle: "biceps", equipment: "barbell", factor: 0.22 },
  { id: "kabelcurls", name: "Kabel-Curls", muscle: "biceps", equipment: "cable", factor: 0.25 },
  { id: "konzentrationscurls", name: "Konzentrationscurls", muscle: "biceps", equipment: "dumbbell", factor: 0.1 },
  { id: "reverse-curls", name: "Reverse Curls", muscle: "biceps", equipment: "barbell", factor: 0.2 },
  { id: "curlmaschine", name: "Curl-Maschine", muscle: "biceps", equipment: "machine", factor: 0.25 },

  // Trizeps
  { id: "engbankdruecken", name: "Enges Bankdrücken", muscle: "triceps", equipment: "barbell", factor: 0.45 },
  { id: "dips-trizeps", name: "Dips (trizepsbetont)", muscle: "triceps", equipment: "bodyweight", factor: null },
  { id: "bankdips", name: "Bankdips", muscle: "triceps", equipment: "bodyweight", factor: null },
  { id: "trizepsdruecken-kabel", name: "Trizepsdrücken am Kabel", muscle: "triceps", equipment: "cable", factor: 0.3 },
  { id: "trizepsdruecken-seil", name: "Trizepsdrücken (Seil)", muscle: "triceps", equipment: "cable", factor: 0.25 },
  { id: "french-press", name: "French Press (SZ)", muscle: "triceps", equipment: "barbell", factor: 0.2 },
  { id: "overhead-trizeps-kh", name: "Überkopf-Trizeps (Kurzhantel)", muscle: "triceps", equipment: "dumbbell", factor: 0.15 },
  { id: "kickbacks", name: "Kickbacks", muscle: "triceps", equipment: "dumbbell", factor: 0.08 },
  { id: "dipmaschine", name: "Dip-Maschine", muscle: "triceps", equipment: "machine", factor: 0.4 },

  // Quadrizeps
  { id: "kniebeugen", name: "Kniebeugen (Langhantel)", muscle: "quads", equipment: "barbell", factor: 0.75 },
  { id: "frontkniebeugen", name: "Frontkniebeugen", muscle: "quads", equipment: "barbell", factor: 0.55 },
  { id: "multipresse-kniebeuge", name: "Kniebeuge (Multipresse)", muscle: "quads", equipment: "machine", factor: 0.7 },
  { id: "beinpresse", name: "Beinpresse", muscle: "quads", equipment: "machine", factor: 1.5 },
  { id: "hackenschmidt", name: "Hackenschmidt-Kniebeuge", muscle: "quads", equipment: "machine", factor: 0.9 },
  { id: "beinstrecker", name: "Beinstrecker", muscle: "quads", equipment: "machine", factor: 0.5 },
  { id: "ausfallschritte-kh", name: "Ausfallschritte (Kurzhantel)", muscle: "quads", equipment: "dumbbell", factor: 0.2 },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", muscle: "quads", equipment: "dumbbell", factor: 0.2 },
  { id: "goblet-squat", name: "Goblet Squat", muscle: "quads", equipment: "dumbbell", factor: 0.3 },
  { id: "step-ups", name: "Step-Ups", muscle: "quads", equipment: "dumbbell", factor: 0.15 },
  { id: "sissy-squat", name: "Sissy Squat", muscle: "quads", equipment: "bodyweight", factor: null },

  // Beinbeuger
  { id: "rumaenisches-kreuzheben", name: "Rumänisches Kreuzheben", muscle: "hamstrings", equipment: "barbell", factor: 0.7 },
  { id: "rumaenisches-kreuzheben-kh", name: "Rumänisches Kreuzheben (Kurzhantel)", muscle: "hamstrings", equipment: "dumbbell", factor: 0.3 },
  { id: "beinbeuger-liegend", name: "Beinbeuger (liegend)", muscle: "hamstrings", equipment: "machine", factor: 0.35 },
  { id: "beinbeuger-sitzend", name: "Beinbeuger (sitzend)", muscle: "hamstrings", equipment: "machine", factor: 0.4 },
  { id: "good-mornings", name: "Good Mornings", muscle: "hamstrings", equipment: "barbell", factor: 0.4 },
  { id: "nordic-curls", name: "Nordic Curls", muscle: "hamstrings", equipment: "bodyweight", factor: null },

  // Gesäß
  { id: "hip-thrust", name: "Hip Thrust", muscle: "glutes", equipment: "barbell", factor: 0.9 },
  { id: "glute-bridge", name: "Glute Bridge", muscle: "glutes", equipment: "barbell", factor: 0.7 },
  { id: "glute-kickbacks-kabel", name: "Glute Kickbacks (Kabel)", muscle: "glutes", equipment: "cable", factor: 0.15 },
  { id: "abduktoren", name: "Abduktoren-Maschine", muscle: "glutes", equipment: "machine", factor: 0.4 },
  { id: "adduktoren", name: "Adduktoren-Maschine", muscle: "glutes", equipment: "machine", factor: 0.4 },

  // Waden
  { id: "wadenheben-stehend", name: "Wadenheben (stehend)", muscle: "calves", equipment: "machine", factor: 0.8 },
  { id: "wadenheben-sitzend", name: "Wadenheben (sitzend)", muscle: "calves", equipment: "machine", factor: 0.5 },
  { id: "wadenheben-beinpresse", name: "Wadenheben (Beinpresse)", muscle: "calves", equipment: "machine", factor: 1.0 },
  { id: "wadenheben-kh", name: "Wadenheben (Kurzhantel)", muscle: "calves", equipment: "dumbbell", factor: 0.3 },

  // Rumpf
  { id: "crunches", name: "Crunches", muscle: "core", equipment: "bodyweight", factor: null },
  { id: "beinheben-haengend", name: "Hängendes Beinheben", muscle: "core", equipment: "bodyweight", factor: null },
  { id: "plank", name: "Plank", muscle: "core", equipment: "bodyweight", factor: null },
  { id: "side-plank", name: "Side Plank", muscle: "core", equipment: "bodyweight", factor: null },
  { id: "russian-twists", name: "Russian Twists", muscle: "core", equipment: "dumbbell", factor: 0.1 },
  { id: "kabel-crunches", name: "Kabel-Crunches", muscle: "core", equipment: "cable", factor: 0.3 },
  { id: "ab-wheel", name: "Ab Wheel", muscle: "core", equipment: "bodyweight", factor: null },
  { id: "bauchmaschine", name: "Bauchmaschine", muscle: "core", equipment: "machine", factor: 0.35 },
];

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

const e = (
  exerciseId: string,
  sets: number,
  repMin: number,
  repMax: number,
  rest: number
) => ({ exerciseId, sets, repMin, repMax, rest });

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
