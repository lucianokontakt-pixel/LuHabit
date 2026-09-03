// Womit man bei einer Übung anfängt, als Anteil des eigenen Körpergewichts.
//
// Ohne diese Schätzung schlägt die App bei einer Übung ohne Verlauf 0 kg vor
// (siehe suggestStartWeight in lib/training.ts). Von Hand gepflegt waren 76 von
// 1295 Übungen — bei allen anderen stand also eine Null, und eine Null bedeutet
// im Rest der App "Eigengewicht": die Progression zählte dann Wiederholungen
// statt Gewicht, an einer Maschine.
//
// Geeicht ist die Tabelle an genau diesen 76 Werten (CATALOG_DEFAULTS in
// lib/exercise-legacy-map.ts). Die behalten Vorrang — sie sind Urteil, das hier
// ist Faustformel.
//
// Zwei Dinge, die man wissen muss, um die Zahlen zu lesen:
//
//   Bei Kurzhanteln ist es das Gewicht *einer* Hantel. 0,20 für Bankdrücken
//   heißt zweimal 0,20 × Körpergewicht in den Händen, nicht einmal.
//
//   Gezielt wird auf ein Gewicht, das für rund zehn saubere Wiederholungen
//   reicht — nicht auf ein Maximum. Zu leicht anzufangen kostet eine Einheit,
//   zu schwer kostet mehr.

/**
 * Der Ausgangswert je Muskelgruppe und Gerät, gemeint für die *führende*
 * Bewegung dieser Kombination: Drücken, Rudern, Ziehen, Beugen. Die leichteren
 * Isolationsübungen leiten sich daraus ab (siehe ISOLATION).
 *
 * Wo die Handarbeit nichts hergab, ist der Wert aus der Nachbarschaft
 * geschätzt: Kettlebell wie Kurzhantel, Band und Ball deutlich darunter.
 */
export const BASIS = {
  chest: { barbell: 0.55, dumbbell: 0.2, machine: 0.5, cable: 0.25, kettlebell: 0.18, band: 0.1, ball: 0.08, other: 0.1 },
  back: { barbell: 0.5, dumbbell: 0.3, machine: 0.55, cable: 0.55, kettlebell: 0.25, band: 0.12, ball: 0.08, other: 0.1 },
  shoulders: { barbell: 0.4, dumbbell: 0.15, machine: 0.4, cable: 0.25, kettlebell: 0.12, band: 0.08, ball: 0.06, other: 0.08 },
  biceps: { barbell: 0.28, dumbbell: 0.13, machine: 0.25, cable: 0.25, kettlebell: 0.12, band: 0.08, ball: 0.05, other: 0.08 },
  triceps: { barbell: 0.2, dumbbell: 0.1, machine: 0.4, cable: 0.3, kettlebell: 0.09, band: 0.08, ball: 0.05, other: 0.08 },
  quads: { barbell: 0.7, dumbbell: 0.3, machine: 0.5, cable: 0.2, kettlebell: 0.25, band: 0.12, ball: 0.08, other: 0.12 },
  hamstrings: { barbell: 0.4, dumbbell: 0.25, machine: 0.4, cable: 0.2, kettlebell: 0.22, band: 0.1, ball: 0.08, other: 0.1 },
  glutes: { barbell: 0.75, dumbbell: 0.2, machine: 0.9, cable: 0.15, kettlebell: 0.25, band: 0.1, ball: 0.08, other: 0.1 },
  calves: { barbell: 0.5, dumbbell: 0.3, machine: 0.8, cable: 0.25, kettlebell: 0.25, band: 0.12, ball: 0.08, other: 0.12 },
  core: { barbell: 0.25, dumbbell: 0.15, machine: 0.35, cable: 0.3, kettlebell: 0.15, band: 0.08, ball: 0.06, other: 0.08 },
};

/**
 * Bewegungen, bei denen der Hebel lang und das Gewicht darum klein ist:
 * Fliegende, Seitheben, Überzüge, Kickbacks. Sie stehen in derselben Zelle wie
 * das Drücken, vertragen aber nur etwa die Hälfte davon — der Unterschied
 * zwischen Schulterdrücken und Seitheben ist größer als der zwischen zwei
 * Muskelgruppen.
 */
export const ISOLATION = /\bfly\b|\bflye|flyes|lateral raise|side lateral|front raise|forward raise|rear delt|reverse fly|reverse pec|pullover|kickback|straight arm|pec deck|concentration|shoulder (?:internal|external) rotation|\bpull ?through\b|abduction|adduction/i;

/** Der Anteil, der von der Zelle übrig bleibt, wenn ISOLATION greift. */
export const ISOLATION_ANTEIL = 0.5;

/**
 * Einbeinig oder einarmig: dieselbe Bewegung, halber Körper. Wirkt zusätzlich
 * zur Isolation — "Cable One Arm Lateral Raise" ist beides.
 *
 * Bei Kurzhanteln nicht: dort ist die Zahl ohnehin schon pro Hand gemeint.
 */
export const EINSEITIG = /one arm|single arm|one leg|single leg|unilateral/i;
export const EINSEITIG_ANTEIL = 0.6;

/**
 * Drei Stellen, an denen die Zelle systematisch danebenliegt — nicht als
 * Einzelfall, sondern weil die Zuordnung des Datensatzes eine andere Frage
 * beantwortet als diese Tabelle.
 */
const SONDERFAELLE = [
  {
    // Enges Bankdrücken zählt im Datensatz zum Trizeps, ist aber eine
    // Bankdrück-Bewegung: 0,20 wäre eine leere Stange.
    wenn: ({ name, muscle }) => muscle === "triceps" && /bench press/i.test(name),
    zelle: "chest",
  },
  {
    // Sitzendes Wadenheben trifft den Soleus statt den Zwillingswadenmuskel
    // und trägt deutlich weniger als stehendes.
    wenn: ({ name, muscle }) => muscle === "calves" && /seated|sitting/i.test(name),
    anteil: 0.6,
  },
];

/** Auf diese Schrittweite wird der Faktor gerundet — mehr Stellen behaupten Genauigkeit, die nicht da ist. */
const RUNDUNG = 0.01;

/**
 * Der Startfaktor einer Übung, oder null bei Eigengewicht.
 *
 * Null heißt nicht "unbekannt", sondern "es gibt nichts zu schätzen": bei
 * Klimmzügen und Liegestützen ist das Gewicht der Körper, und den kennt die
 * App aus den Messwerten.
 */
export function startFaktor({ name, muscle, equipment, isolation, einseitig }) {
  if (equipment === "bodyweight") return null;
  const sonder = SONDERFAELLE.find((f) => f.wenn({ name, muscle, equipment }));
  const zelle = BASIS[sonder?.zelle ?? muscle];
  if (!zelle) return null;
  const basis = zelle[equipment];
  if (!basis) return null;

  // Die zwei Regexe waren ein Ersatz für Angaben, die der Datensatz nicht
  // hatte. Wo sie jetzt als Feld kommen (mechanic, is_unilateral), zählt das
  // Feld: "Zottman-Curl" steht in keiner Namensliste und ist trotzdem eine
  // Isolationsübung.
  let faktor = basis * (sonder?.anteil ?? 1);
  if (isolation ?? ISOLATION.test(name)) faktor *= ISOLATION_ANTEIL;
  if (equipment !== "dumbbell" && (einseitig ?? EINSEITIG.test(name))) faktor *= EINSEITIG_ANTEIL;

  return Math.max(RUNDUNG, Math.round(faktor / RUNDUNG) * RUNDUNG);
}
