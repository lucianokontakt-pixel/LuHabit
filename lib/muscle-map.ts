import { MUSCLES, workingSets, type Exercise, type Muscle, type WorkoutSession } from "@/lib/training";

/**
 * Welche Flächen der Körperkarte zu welcher Muskelgruppe gehören.
 *
 * Die Zeichnung kennt achtzehn Muskeln, die Bibliothek zehn Gruppen. Rücken
 * deckt deshalb oberen Rücken, Nacken und unteren Rücken ab, Rumpf den Bauch
 * und die seitliche Bauchmuskulatur — eine Gruppe färbt alles, was sie meint.
 */
export const MAP_AREAS: Record<Muscle, string[]> = {
  chest: ["chest"],
  back: ["upper-back", "lower-back", "trapezius"],
  shoulders: ["deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  calves: ["calves"],
  core: ["abs", "obliques"],
};

/**
 * Was gezeichnet, aber nie eingefärbt wird.
 *
 * Kopf, Hände und Füße tragen keine Last. Unterarme, Adduktoren, Schienbeine,
 * Serratus und Hüftbeuger schon — nur führt die Bibliothek sie nicht als eigene
 * Gruppe, also kann die Karte über sie nichts sagen. Sie als „nicht trainiert"
 * einzufärben wäre eine Behauptung, die aus den Daten nicht folgt; als
 * Silhouette gehören sie zur Figur und zu keiner Aussage.
 */
export const SILHOUETTE = [
  "head",
  "hair",
  "neck",
  "hands",
  "feet",
  "knees",
  "ankles",
  "forearm",
  "adductors",
  "tibialis",
  "serratus",
  "hip-flexors",
];

/** Arbeitssätze je Muskelgruppe über alle übergebenen Einheiten. */
export function setsPerMuscle(
  sessions: WorkoutSession[],
  exerciseById: Record<string, Exercise>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const session of sessions) {
    for (const set of workingSets(session.sets)) {
      const muscle = exerciseById[set.exerciseId]?.muscle;
      if (muscle) out[muscle] = (out[muscle] ?? 0) + 1;
    }
  }
  return out;
}

/**
 * Die Schattierung je Fläche, 0 bis 4 — gemessen an der am härtesten
 * gearbeiteten Gruppe im selben Zeitraum.
 *
 * Bewusst relativ: die Karte beantwortet „ist mein Training ausgewogen", und
 * das ist ein Vergleich innerhalb einer Periode. Wie viele Sätze eine Gruppe
 * absolut braucht, steht daneben im Korridor 10–20.
 */
export function mapLevels(setsByMuscle: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...MUSCLES.map((m) => setsByMuscle[m.key] ?? 0));
  const levels: Record<string, number> = {};
  for (const { key } of MUSCLES) {
    const sets = setsByMuscle[key] ?? 0;
    const level = sets <= 0 || max <= 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((sets / max) * 4)));
    for (const area of MAP_AREAS[key]) levels[area] = level;
  }
  return levels;
}

/** Die Gruppen ohne einen einzigen Satz — in der Reihenfolge der Bibliothek. */
export function untrainedMuscles(setsByMuscle: Record<string, number>): Muscle[] {
  return MUSCLES.filter((m) => !(setsByMuscle[m.key] > 0)).map((m) => m.key);
}
