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

/** Push / Pull / Legs — der Startplan, der beim ersten Öffnen angelegt wird. */
export const STARTER_PLAN: {
  name: string;
  days: { name: string; exercises: { exerciseId: string; sets: number; repMin: number; repMax: number; rest: number }[] }[];
} = {
  name: "Push / Pull / Legs",
  days: [
    {
      name: "Push",
      exercises: [
        { exerciseId: "bankdruecken-lh", sets: 3, repMin: 8, repMax: 12, rest: 150 },
        { exerciseId: "schraegbank-kh", sets: 3, repMin: 8, repMax: 12, rest: 120 },
        { exerciseId: "schulterdruecken-kh", sets: 3, repMin: 8, repMax: 12, rest: 120 },
        { exerciseId: "seitheben-kh", sets: 3, repMin: 10, repMax: 15, rest: 75 },
        { exerciseId: "trizepsdruecken-seil", sets: 3, repMin: 10, repMax: 15, rest: 75 },
        { exerciseId: "dips-trizeps", sets: 3, repMin: 8, repMax: 12, rest: 90 },
      ],
    },
    {
      name: "Pull",
      exercises: [
        { exerciseId: "klimmzuege", sets: 3, repMin: 6, repMax: 12, rest: 150 },
        { exerciseId: "langhantelrudern", sets: 3, repMin: 8, repMax: 12, rest: 150 },
        { exerciseId: "latzug-breit", sets: 3, repMin: 8, repMax: 12, rest: 120 },
        { exerciseId: "rudern-kabel", sets: 3, repMin: 8, repMax: 12, rest: 120 },
        { exerciseId: "face-pulls", sets: 3, repMin: 12, repMax: 15, rest: 75 },
        { exerciseId: "sz-curls", sets: 3, repMin: 8, repMax: 12, rest: 90 },
      ],
    },
    {
      name: "Legs",
      exercises: [
        { exerciseId: "kniebeugen", sets: 4, repMin: 8, repMax: 12, rest: 180 },
        { exerciseId: "rumaenisches-kreuzheben", sets: 3, repMin: 8, repMax: 12, rest: 150 },
        { exerciseId: "beinpresse", sets: 3, repMin: 10, repMax: 15, rest: 120 },
        { exerciseId: "beinbeuger-liegend", sets: 3, repMin: 10, repMax: 15, rest: 90 },
        { exerciseId: "wadenheben-stehend", sets: 4, repMin: 12, repMax: 20, rest: 60 },
        { exerciseId: "beinheben-haengend", sets: 3, repMin: 10, repMax: 15, rest: 60 },
      ],
    },
  ],
};
