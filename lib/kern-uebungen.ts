/**
 * Die Übungen, mit denen man nichts falsch macht — von Hand ausgesucht, nicht
 * aus der Beliebtheitsstufe abgeleitet: die steht bei rund zwei Dritteln des
 * Katalogs auf 4 oder 5 und taugt darum nicht als "das hier ist ein
 * Klassiker"-Signal.
 *
 * Zwei bis vier je Muskelgruppe, die bekannten Grundübungen — und je einmal
 * die Maschinen-Variante dort, wo sie im Studio häufiger steht als die
 * Langhantel.
 *
 * Die Liste tut zweierlei: sie trägt das „Bewährt"-Abzeichen in Bibliothek und
 * Übungswähler, und sie hebt bei gleich gutem Suchtreffer den Klassiker über
 * seine Varianten — wer "bankdrücken" tippt, meint das Bankdrücken und nicht
 * "Bankdrücken enger Griff".
 */
export const KERN_UEBUNGEN_IDS: readonly string[] = [
  // Brust
  "bench-press", // Langhantel-Bankdrücken
  "incline-bench-press", // Schrägbankdrücken mit Langhantel
  "db-bench-press", // Kurzhantel-Bankdrücken
  "chest-press-machine", // Maschinen-Brustdrücken
  "push-up", // Push-Up
  // Rücken
  "barbell-row", // Vorgebeugtes Langhantelrudern
  "lat-pulldown", // Latzug
  "seated-cable-row", // Sitzendes Rudern am Kabelzug
  "pull-up", // Klimmzug
  "deadlift", // Langhantel-Kreuzheben
  // Schultern
  "ohp", // Langhantel-Schulterdrücken
  "seated-db-press", // Sitzende Kurzhantel-Schulterdrücken
  "machine-shoulder-press", // Maschine Schulterdrücken
  "lateral-raise", // Kurzhantel Seitheben
  // Bizeps
  "barbell-curl", // Langhantel-Curl
  "ez-bar-curl", // SZ-Stangen-Curl
  "hammer-curl", // Kurzhantel Hammer Curl
  // Trizeps
  "tricep-pushdown", // Kabel-Trizeps-Pushdown
  "bench-dips", // Bank-Dips
  // Quadrizeps
  "squat", // Langhantel-Kniebeuge
  "leg-press", // Beinpresse
  "leg-extension", // Beinstrecker
  // Beinbeuger
  "romanian-deadlift", // Rumänisches Kreuzheben
  "leg-curl", // Liegender Beinbeuger
  "seated-leg-curl", // Sitzende Beinbeuge
  // Gesäß
  "hip-thrust", // Langhantel Hip Thrust
  // Waden
  "standing-calf-raise", // Stehende Wadenhebeübung
  "seated-calf-raise", // Sitzende Wadenübung
  // Rumpf
  "hanging-leg-raise", // Hängendes Beinheben
  "plank", // Plank
];

export const KERN_UEBUNGEN = new Set(KERN_UEBUNGEN_IDS);

/** Kern-Übungen zuerst — als Zahl, damit man sie in ein sort() hängen kann. */
export function kernRang(id: string): number {
  return KERN_UEBUNGEN.has(id) ? 1 : 0;
}
