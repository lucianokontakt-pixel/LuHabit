/**
 * Die englischen Begriffe des Datensatzes auf Deutsch.
 *
 * RepDB liefert Namen, Beschreibungen und Anleitungen übersetzt — die
 * Schlüsselwörter dahinter (`gluteus_maximus`, `hypertrophy`, `knee_safe`)
 * aber nicht: das sind Bezeichner, keine Texte. Sie stehen trotzdem in der
 * Oberfläche, sobald man eine Übung aufschlägt, und "gluteus_maximus" ist
 * dort keine Auskunft, sondern eine Zumutung.
 *
 * Fehlt ein Begriff, zeigt die Oberfläche den Bezeichner lesbar gemacht
 * (siehe lesbar) statt gar nichts — ein neuer Datensatz-Stand soll keine
 * leeren Stellen hinterlassen.
 */

/** Die 30 Muskeln des Datensatzes, anatomisch aber verständlich benannt. */
export const MUSKEL_NAMEN: Record<string, string> = {
  pectoralis_major: "Großer Brustmuskel",
  serratus_anterior: "Sägemuskel",
  latissimus_dorsi: "Latissimus",
  trapezius: "Trapezmuskel",
  rhomboids: "Rautenmuskeln",
  erector_spinae: "Rückenstrecker",
  quadratus_lumborum: "Quadratischer Lendenmuskel",
  supraspinatus: "Obergrätenmuskel",
  anterior_deltoid: "Vordere Schulter",
  lateral_deltoid: "Seitliche Schulter",
  posterior_deltoid: "Hintere Schulter",
  biceps_brachii: "Bizeps",
  brachialis: "Oberarmmuskel",
  brachioradialis: "Oberarmspeichenmuskel",
  triceps_brachii: "Trizeps",
  forearm_flexors: "Unterarmbeuger",
  forearm_extensors: "Unterarmstrecker",
  forearms: "Unterarme",
  rectus_abdominis: "Gerader Bauchmuskel",
  transverse_abdominis: "Querer Bauchmuskel",
  obliques: "Schräge Bauchmuskeln",
  hip_flexors: "Hüftbeuger",
  gluteus_maximus: "Großer Gesäßmuskel",
  gluteus_medius: "Mittlerer Gesäßmuskel",
  abductors: "Abduktoren",
  adductors: "Adduktoren",
  quadriceps: "Quadrizeps",
  hamstrings: "Beinbeuger",
  gastrocnemius: "Zwillingswadenmuskel",
  soleus: "Schollenmuskel",
};

/** Wozu eine Übung taugt. */
export const ZIEL_NAMEN: Record<string, string> = {
  hypertrophy: "Muskelaufbau",
  strength: "Kraft",
  endurance: "Ausdauer",
  power: "Schnellkraft",
  mobility: "Beweglichkeit",
  rehabilitation: "Reha",
  core: "Rumpfstabilität",
};

/**
 * Die Schlagworte. Zwei Sorten mischen sich hier, und beide sind nützlich:
 * Schonhinweise ("knee_safe") und Einordnungen ("push_day").
 */
export const TAG_NAMEN: Record<string, string> = {
  knee_safe: "knieschonend",
  lower_back_safe: "rückenschonend",
  shoulder_safe: "schulterschonend",
  no_axial_load: "keine Wirbelsäulenlast",
  shoulder_stability: "Schulterstabilität",
  push_day: "Push",
  pull_day: "Pull",
  leg_day: "Beine",
  arm_day: "Arme",
  full_body: "Ganzkörper",
  core: "Rumpf",
  core_focus: "Rumpf-Fokus",
  glute_focus: "Gesäß-Fokus",
  shoulder_focus: "Schulter-Fokus",
  chest_focus: "Brust-Fokus",
  calf_focus: "Waden-Fokus",
  grip_focus: "Griffkraft",
  calisthenics: "Eigengewicht",
  mobility: "Beweglichkeit",
  stretching: "Dehnen",
  conditioning: "Kondition",
  warm_up: "Aufwärmen",
  powerlifting: "Powerlifting",
  big_three: "Die großen Drei",
  requires_bench: "braucht eine Bank",
};

/**
 * Ein Bezeichner, notdürftig lesbar gemacht — der Rückfall, wenn oben nichts
 * steht. "hip_thrust" wird zu "Hip thrust": nicht schön, aber ehrlicher als
 * eine erfundene Übersetzung und besser als der rohe Schlüssel.
 */
export function lesbar(schluessel: string): string {
  const worte = schluessel.replace(/_/g, " ");
  return worte.charAt(0).toUpperCase() + worte.slice(1);
}

export const muskelName = (k: string) => MUSKEL_NAMEN[k] ?? lesbar(k);
export const zielName = (k: string) => ZIEL_NAMEN[k] ?? lesbar(k);
export const tagName = (k: string) => TAG_NAMEN[k] ?? lesbar(k);
