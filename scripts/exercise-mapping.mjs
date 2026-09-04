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

/**
 * Die Nebenmuskeln. Eigenes Vokabular, und das ist der Punkt: sie stehen im
 * Datensatz im Feld `sm`, das ganz andere Wörter benutzt als der Zielmuskel in
 * `tg` — "shoulders" statt "delts", "quadriceps" statt "quads", "chest" statt
 * "pectorals".
 *
 * Hier stand vorher `{ ...MUSCLE }`, also die Zuordnung für `tg`, angewendet
 * auf `sm`. Die häufigsten Nebenmuskeln überhaupt — shoulders (400×),
 * quadriceps (161×), chest (91×), core (94×), obliques (72×), lower back (71×)
 * — waren darin keine Schlüssel und fielen still heraus. Ergebnis: 530 Übungen
 * ohne einen einzigen Nebenmuskel, und chest, shoulders, quads und core kamen
 * in `secondary` überhaupt nie vor.
 *
 * Was hier fehlt, fehlt mit Absicht: Knöchel, Handgelenke, Hände, Füße und der
 * Kopfwender tragen keine Last, die LuHabit zählen würde.
 */
export const SECONDARY = {
  chest: "chest",
  "upper chest": "chest",
  back: "back",
  "upper back": "back",
  "lower back": "back",
  lats: "back",
  "latissimus dorsi": "back",
  rhomboids: "back",
  trapezius: "back",
  traps: "back",
  shoulders: "shoulders",
  deltoids: "shoulders",
  "rear deltoids": "shoulders",
  "rotator cuff": "shoulders",
  biceps: "biceps",
  brachialis: "biceps",
  forearms: "biceps",
  "grip muscles": "biceps",
  "wrist flexors": "biceps",
  "wrist extensors": "biceps",
  triceps: "triceps",
  quadriceps: "quads",
  "hip flexors": "quads",
  groin: "quads",
  "inner thighs": "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  calves: "calves",
  soleus: "calves",
  shins: "calves",
  core: "core",
  abdominals: "core",
  "lower abs": "core",
  obliques: "core",
  "cardiovascular system": "core",
};
