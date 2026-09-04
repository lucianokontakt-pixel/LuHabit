/**
 * Die Übungen, mit denen man nichts falsch macht — von Hand ausgesucht, nicht
 * aus der Beliebtheitsstufe abgeleitet: die steht bei über 40 % des Katalogs
 * auf der höchsten Stufe (aus Gerät und Name geschätzt, nicht kuratiert) und
 * taugt darum nicht als "das hier ist ein Klassiker"-Signal.
 *
 * Zwei bis drei je Muskelgruppe, die bekannten Grundübungen. Eine ID-Liste
 * statt eines Felds im Katalog: die Auswahl ändert sich mit Geschmack, nicht
 * mit dem Datensatz, und soll darum an einer Stelle stehen, die man beim
 * Lesen versteht, ohne den ganzen Katalog zu durchsuchen.
 */
export const KERN_UEBUNGEN_IDS: readonly string[] = [
  // Brust
  "og-0025", // Barbell Bench Press
  "og-0047", // Barbell Incline Bench Press
  "og-0662", // Push-Up
  // Rücken
  "og-0027", // Barbell Bent Over Row
  "og-2330", // Cable Lat Pulldown Full Range Of Motion
  "og-1326", // Chin-Up
  // Schultern
  "og-0091", // Barbell Seated Overhead Press
  "og-0334", // Dumbbell Lateral Raise
  // Bizeps
  "og-0031", // Barbell Curl
  "og-0313", // Dumbbell Hammer Curl
  // Trizeps
  "og-0241", // Cable Triceps Pushdown (V-Bar)
  "og-0814", // Triceps Dip
  // Quadrizeps
  "og-0043", // Barbell Full Squat
  "og-0585", // Lever Leg Extension
  // Beinbeuger
  "og-0085", // Barbell Romanian Deadlift
  "og-0599", // Lever Seated Leg Curl
  // Gesäß
  "og-0032", // Barbell Deadlift
  "og-1409", // Barbell Glute Bridge
  // Waden
  "og-1372", // Barbell Standing Calf Raise
  "og-0594", // Lever Seated Calf Raise
  // Rumpf
  "og-0472", // Hanging Leg Raise
  "og-2135", // Weighted Front Plank
];

export const KERN_UEBUNGEN = new Set(KERN_UEBUNGEN_IDS);
