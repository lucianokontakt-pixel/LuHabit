// Die Vokabeln von RepDB in die der App übersetzt.
//
// RepDB beschreibt Übungen feiner, als die App sie führt: 27 Muskeln statt 10
// Gruppen, 55 Geräte statt 9. Das ist kein Mangel auf einer der beiden Seiten
// — die App sortiert eine Bibliothek und plant Einheiten, dafür sind zehn
// Gruppen richtig; der Datensatz beschreibt eine Bewegung, dafür ist
// "gluteus_maximus" richtig. Diese Datei ist die Brücke.
//
// Beide Richtungen bleiben erhalten: `muscle` trägt die Gruppe, die neuen
// Felder `primaerMuskeln`/`sekundaerMuskeln` die genauen Namen.

/**
 * Der genaue Muskel → die Muskelgruppe der App.
 *
 * Die Zuordnung ist an einer Stelle uneindeutig, und das ist Absicht: die
 * Hüftbeuger (`hip_flexors`) zählen hier zum Rumpf. Sie gehören anatomisch
 * zum Oberschenkel, kommen im Training aber fast nur in Bauchübungen vor —
 * hängendes Beinheben unter "Quadrizeps" wäre in einem Plan eine Überraschung.
 */
export const MUSKEL_GRUPPE = {
  pectoralis_major: "chest",
  latissimus_dorsi: "back",
  rhomboids: "back",
  trapezius: "back",
  erector_spinae: "back",
  quadratus_lumborum: "back",
  anterior_deltoid: "shoulders",
  lateral_deltoid: "shoulders",
  posterior_deltoid: "shoulders",
  biceps_brachii: "biceps",
  brachialis: "biceps",
  brachioradialis: "biceps",
  forearm_flexors: "biceps",
  forearm_extensors: "triceps",
  triceps_brachii: "triceps",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  gluteus_maximus: "glutes",
  gluteus_medius: "glutes",
  abductors: "glutes",
  adductors: "quads",
  gastrocnemius: "calves",
  soleus: "calves",
  rectus_abdominis: "core",
  transverse_abdominis: "core",
  obliques: "core",
  hip_flexors: "core",
};

/**
 * Der genaue Muskel → die Untergruppe der App, wo es eine gibt.
 *
 * Das ist der eigentliche Gewinn des Datensatzes: die Region stand hier
 * bisher als Namensregex ("enthält 'lateral raise' → seitliche Schulter") und
 * damit als Vermutung. Jetzt steht sie im Datensatz — für 240 der 601
 * Übungen fällt sie direkt aus dem primären Muskel.
 *
 * Die Brust fehlt: RepDB kennt nur `pectoralis_major`, nicht oben/Mitte/unten.
 * Dafür gibt es weiter eine Namensregel, siehe brustRegion.
 */
export const MUSKEL_REGION = {
  anterior_deltoid: "delts-front",
  lateral_deltoid: "delts-side",
  posterior_deltoid: "delts-rear",
  latissimus_dorsi: "lats",
  rhomboids: "back-upper",
  trapezius: "traps",
  erector_spinae: "back-lower",
  quadratus_lumborum: "back-lower",
  rectus_abdominis: "abs",
  transverse_abdominis: "abs",
  hip_flexors: "abs",
  obliques: "obliques",
};

/**
 * Die Brustregion aus dem Namen — die einzige Region, die der Datensatz nicht
 * hergibt. Die deutschen Namen sind dafür deutlich genug: "Schrägbank" heißt
 * oben, "Negativbank" und Dips heißen unten, alles andere ist die Mitte.
 */
export function brustRegion(nameDe) {
  if (/schrägbank|incline/i.test(nameDe)) return "chest-upper";
  if (/negativ|decline|\bdip/i.test(nameDe)) return "chest-lower";
  return "chest-mid";
}

/**
 * Das RepDB-Gerät → das Gerät der App.
 *
 * Zusammengelegt wird nach der Frage, die im Studio zählt: "was muss ich in
 * die Hand nehmen?" — nicht nach der Bauform. Eine SZ-Stange ist eine
 * Langhantel, ein Klimmzugbalken ist Körpergewicht, und die zwei Dutzend
 * benannten Maschinen sind alle "Maschine". Was die Maschine unterscheidet,
 * trägt danach die Ladeart (siehe LADEART_GERAET).
 */
export const GERAET = {
  barbell: "barbell",
  ez_bar: "barbell",
  trap_bar: "barbell",
  smith_machine: "barbell",
  plates: "barbell",
  dumbbell: "dumbbell",
  kettlebell: "kettlebell",
  cable: "cable",
  battle_rope: "cable",
  loop_band: "band",
  resistance_band: "band",
  stability_ball: "ball",
  slam_ball: "ball",
  pull_up_bar: "bodyweight",
  dip_station: "bodyweight",
  rings: "bodyweight",
  suspension_trainer: "bodyweight",
  flat_bench: "bodyweight",
  plyo_box: "bodyweight",
  climbing_rope: "bodyweight",
  jump_rope: "bodyweight",
  ab_wheel: "other",
  wrist_roller: "other",
  sled: "other",
  // Ausdauergeräte: kein Gewicht, das man einstellt, und keine Sätze im Sinne
  // der App. Sie stehen als "Sonstiges" in der Bibliothek statt zu fehlen.
  treadmill: "other",
  rower: "other",
  air_bike: "other",
  stationary_bike: "other",
  elliptical: "other",
  stair_climber: "other",
};

/**
 * Alles, was auf `_machine` endet oder eine benannte Maschine ist, wird
 * "machine" — die Liste wäre sonst dreimal so lang und müsste bei jedem neuen
 * Gerät nachgezogen werden.
 */
export function geraetVon(equipment, istEigengewicht) {
  if (!equipment) return istEigengewicht ? "bodyweight" : "other";
  const bekannt = GERAET[equipment];
  if (bekannt) return bekannt;
  return "machine";
}

/**
 * Wie das Gewicht an das Gerät kommt.
 *
 * Das war bis eben Handarbeit: 145 Maschinen einzeln angesehen, weil
 * openGym alles "machine" nannte. RepDB benennt das Gerät genau genug, um es
 * abzuleiten — eine `plate_loaded_lateral_raise_machine` sagt es im Namen,
 * ein `leg_curl` hat einen Gewichtsblock.
 */
export const LADEART_GERAET = {
  smith_machine: "scheiben",
  plates: "scheiben",
  hack_squat: "scheiben",
  sled: "scheiben",
  leg_press: "scheiben",
};

export function ladeartVon({ equipment, geraet, istEigengewicht }) {
  if (istEigengewicht) return "ohne";
  if (geraet === "barbell") return "scheiben";
  if (geraet === "dumbbell" || geraet === "kettlebell") return "frei";
  if (geraet === "cable") return "steck";
  if (geraet !== "machine") return "ohne";

  if (equipment && LADEART_GERAET[equipment]) return LADEART_GERAET[equipment];
  // "plate_loaded_…" trägt die Antwort im Namen.
  if (equipment && /plate_loaded|plate-loaded/.test(equipment)) return "scheiben";
  // Der Rest der benannten Maschinen läuft über einen Gewichtsblock. Anders
  // als bei openGym ist das hier keine Behauptung ins Blaue: der Datensatz
  // benennt die Scheibenmaschinen ausdrücklich, was übrig bleibt, ist Steck.
  return "steck";
}

/**
 * Wie üblich eine Übung ist, 1–5 — die Zahl, die entscheidet, was in der
 * Bibliothek oben steht und was erst auf Nachfrage erscheint.
 *
 * Bisher aus dem Gerät geraten. Jetzt aus dem, was der Datensatz über die
 * Übung selbst sagt: Grundübungen für Anfänger oben, Spezielles unten. Dehnen
 * und Ausdauer landen unter der Sichtbarkeitsgrenze (3) — sie sollen in einer
 * Krafttrainings-App nicht zwischen den Sätzen stehen, aber auffindbar
 * bleiben.
 */
export function beliebtheit({ category, mechanic, difficulty }) {
  if (category === "stretching") return 1;
  if (category === "cardio") return 2;
  if (category === "plyometrics") return 2;

  let stufe = mechanic === "compound" ? 4 : 3;
  if (difficulty === "beginner") stufe += 1;
  if (difficulty === "advanced") stufe -= 1;
  return Math.min(5, Math.max(1, stufe));
}
