// Übersetzt openGyms Übungs-Vokabular in das von LuHabit.
// Von build-exercise-catalog.mjs benutzt, hier getrennt, damit die Zuordnungen
// ohne den Generator-Krempel lesbar bleiben.

/** openGym kennt 29 Geräte, LuHabit neun Kategorien. */
export const EQUIPMENT = {
  barbell: "barbell",
  "ez barbell": "barbell",
  "olympic barbell": "barbell",
  "trap bar": "barbell",
  dumbbell: "dumbbell",
  cable: "cable",
  "leverage machine": "machine",
  "smith machine": "machine",
  "sled machine": "machine",
  assisted: "machine",
  "skierg machine": "machine",
  "stationary bike": "machine",
  "elliptical machine": "machine",
  "stepmill machine": "machine",
  "upper body ergometer": "machine",
  "body weight": "bodyweight",
  weighted: "bodyweight",
  kettlebell: "kettlebell",
  band: "band",
  "resistance band": "band",
  "medicine ball": "ball",
  "stability ball": "ball",
  "bosu ball": "ball",
  rope: "other",
  roller: "other",
  "wheel roller": "other",
  hammer: "other",
  tire: "other",
};

/**
 * openGyms Zielmuskel auf LuHabits zehn Gruppen. Wo LuHabit die Gruppe nicht
 * kennt, zählt die Übung dorthin, wo sie im Trainingsplan üblicherweise liegt:
 * Unterarme zum Bizeps-Tag, Nacken und Rückenstrecker zum Rücken,
 * Adduktoren zum Beinstrecker-Tag, Abduktoren zum Gesäß.
 */
export const MUSCLE = {
  abs: "core",
  "serratus anterior": "core",
  pectorals: "chest",
  lats: "back",
  "upper back": "back",
  traps: "back",
  spine: "back",
  "levator scapulae": "back",
  delts: "shoulders",
  biceps: "biceps",
  forearms: "biceps",
  triceps: "triceps",
  quads: "quads",
  adductors: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  abductors: "glutes",
  calves: "calves",
};

/** Nur fürs Anzeigen der Nebenmuskeln — gröber als MUSCLE, aber vollständig. */
export const SECONDARY = {
  ...MUSCLE,
  "cardiovascular system": "core",
};
