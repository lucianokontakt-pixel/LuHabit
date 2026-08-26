// Übersetzt openGyms englische Übungsnamen in LuHabits Schreibweise:
// Kern-Bewegung zuerst, Zusätze in Klammern — "Bankdrücken (eng, Langhantel)".
//
// Die Namen sind fast durchweg nach demselben Muster gebaut (Gerät + Zusätze +
// Bewegung), darum reicht ein Wörterbuch statt 1295 Einzelübersetzungen. Der
// Generator zählt, was übrig bleibt, damit Lücken auffallen.

/** Geräte-Wörter — die stehen später als Kategorie in der Klammer. */
const EQUIPMENT_WORDS = new Set([
  "barbell", "dumbbell", "cable", "lever", "smith", "sled", "band", "kettlebell",
  "bodyweight", "roller", "tire", "machine", "ez", "olympic", "trap", "resistance",
  "assisted", "leverage", "stationary", "elliptical", "stepmill", "skierg",
  "ergometer", "bosu",
]);

/**
 * Kern-Bewegungen. Der Scanner nimmt immer den längsten Treffer, darum dürfen
 * kurze und lange Einträge nebeneinander stehen.
 */
const CORE = {
  // Drücken
  "bench press": "Bankdrücken",
  "incline bench press": "Schrägbankdrücken",
  "decline bench press": "Negativbankdrücken",
  "incline press": "Schrägbankdrücken",
  "decline press": "Negativbankdrücken",
  "incline chest press": "Schrägbank-Brustpresse",
  "decline chest press": "Negativbank-Brustpresse",
  "floor press": "Bodendrücken",
  "chest press": "Brustpresse",
  "shoulder press": "Schulterdrücken",
  "military press": "Nackendrücken",
  "overhead press": "Überkopfdrücken",
  "push press": "Push Press",
  "arnold press": "Arnold Press",
  "z press": "Z-Press",
  "jm bench press": "JM-Bankdrücken",
  "pin press": "Pin Press",
  "pin presses": "Pin Press",
  "board press": "Board Press",
  "landmine press": "Landmine Press",
  thruster: "Thruster",
  press: "Drücken",
  "leg press": "Beinpresse",
  "calf press": "Wadenpresse",
  "shoulder raise": "Schulterheben",
  "chest dip": "Dips (brustbetont)",
  "triceps dip": "Dips (trizepsbetont)",
  "tricep dip": "Dips (trizepsbetont)",
  "bench dip": "Bankdips",
  dip: "Dips",
  dips: "Dips",
  "push-up": "Liegestütze",
  "push up": "Liegestütze",
  "push-ups": "Liegestütze",
  "push ups": "Liegestütze",
  pushup: "Liegestütze",
  "muscle up": "Muscle-Up",
  "muscle-up": "Muscle-Up",
  handstand: "Handstand",
  planche: "Planche",
  "iron cross": "Eisernes Kreuz",

  // Ziehen
  "pull-up": "Klimmzüge",
  "pull up": "Klimmzüge",
  "pull-ups": "Klimmzüge",
  "pull ups": "Klimmzüge",
  pullup: "Klimmzüge",
  "chin-up": "Klimmzüge (Untergriff)",
  "chin up": "Klimmzüge (Untergriff)",
  "chin-ups": "Klimmzüge (Untergriff)",
  pulldown: "Latzug",
  "lat pulldown": "Latzug",
  "pull down": "Latzug",
  "pull-down": "Latzug",
  pullover: "Überzüge",
  row: "Rudern",
  "bent over row": "Vorgebeugtes Rudern",
  "bent-over row": "Vorgebeugtes Rudern",
  "upright row": "Aufrechtes Rudern",
  "seated row": "Rudern (sitzend)",
  "inverted row": "Australian Pull-ups",
  "t-bar row": "T-Bar-Rudern",
  "t bar row": "T-Bar-Rudern",
  "t-bar reverse grip row": "T-Bar-Rudern (Untergriff)",
  "renegade row": "Renegade Row",
  shrug: "Shrugs",
  shrugs: "Shrugs",
  "face pull": "Face Pulls",
  "face pulls": "Face Pulls",
  deadlift: "Kreuzheben",
  "romanian deadlift": "Rumänisches Kreuzheben",
  "stiff leg deadlift": "Gestrecktes Kreuzheben",
  "straight leg deadlift": "Gestrecktes Kreuzheben",
  "sumo deadlift": "Sumo-Kreuzheben",
  "rack pull": "Rack Pulls",
  "good morning": "Good Mornings",
  "good mornings": "Good Mornings",
  clean: "Umsetzen",
  "power clean": "Power Clean",
  "clean and jerk": "Umsetzen und Stoßen",
  "clean and press": "Umsetzen und Drücken",
  snatch: "Reißen",
  jerk: "Stoßen",
  swing: "Swings",
  swings: "Swings",
  "high pull": "High Pull",
  "battling ropes": "Battle Ropes",
  "battle ropes": "Battle Ropes",
  "judo flip": "Judo Flip",
  skier: "Skier",
  "back lever": "Back Lever",
  "front lever": "Front Lever",

  // Arme
  curl: "Curls",
  curls: "Curls",
  "biceps curl": "Bizeps-Curls",
  "bicep curl": "Bizeps-Curls",
  "hammer curl": "Hammercurls",
  "preacher curl": "Scott-Curls",
  "concentration curl": "Konzentrationscurls",
  "spider curl": "Spider-Curls",
  "drag curl": "Drag-Curls",
  "zottman curl": "Zottman-Curls",
  "ez barbell curl": "SZ-Curls",
  "ez-barbell curl": "SZ-Curls",
  "ez-bar curl": "SZ-Curls",
  "ez bar curl": "SZ-Curls",
  "wrist curl": "Handgelenk-Curls",
  "finger curl": "Finger-Curls",
  "finger curls": "Finger-Curls",
  "leg curl": "Beinbeuger",
  "hamstring curl": "Beinbeuger",
  "curl-up": "Curl-up",
  "triceps extension": "Trizepsstrecken",
  "tricep extension": "Trizepsstrecken",
  "triceps pushdown": "Trizepsdrücken",
  "tricep pushdown": "Trizepsdrücken",
  pushdown: "Trizepsdrücken",
  "triceps kickback": "Kickbacks",
  "tricep kickback": "Kickbacks",
  kickback: "Kickbacks",
  kickbacks: "Kickbacks",
  "leg extension": "Beinstrecker",
  "french press": "French Press",
  "skull crusher": "Skull Crusher",
  skullcrusher: "Skull Crusher",
  "wrist rotation": "Handgelenk-Rotation",
  "wrist extension": "Handgelenk-Strecken",
  pronation: "Pronation",
  supination: "Supination",

  // Schultern / Brust
  "lateral raise": "Seitheben",
  "side lateral raise": "Seitheben",
  "front raise": "Frontheben",
  "rear delt raise": "Vorgebeugtes Seitheben",
  "rear lateral raise": "Vorgebeugtes Seitheben",
  "rear delt row": "Vorgebeugtes Rudern",
  "rear delt fly": "Reverse Butterfly",
  "reverse fly": "Reverse Butterfly",
  "y-raise": "Y-Heben",
  "t-raise": "T-Heben",
  "l-raise": "L-Heben",
  "v-up": "V-ups",
  "v-ups": "V-ups",
  fly: "Fliegende",
  flye: "Fliegende",
  flys: "Fliegende",
  flyes: "Fliegende",
  "incline fly": "Schrägbank-Fliegende",
  "decline fly": "Negativbank-Fliegende",
  "chest fly": "Fliegende",
  butterfly: "Butterfly",
  "cross-over": "Kabelzug-Überkreuzen",
  crossover: "Kabelzug-Überkreuzen",
  crossovers: "Kabelzug-Überkreuzen",
  "scapula dip": "Scapula-Dips",
  "scapular pull-up": "Scapula-Klimmzüge",

  // Beine
  squat: "Kniebeugen",
  squats: "Kniebeugen",
  "front squat": "Frontkniebeugen",
  "hack squat": "Hackenschmidt-Kniebeuge",
  "goblet squat": "Goblet Squat",
  "split squat": "Split Squat",
  "bulgarian split squat": "Bulgarian Split Squat",
  "sissy squat": "Sissy Squat",
  "jump squat": "Sprungkniebeugen",
  "squat jump": "Sprungkniebeugen",
  "pistol squat": "Pistol Squat",
  "zercher squat": "Zercher-Kniebeuge",
  "box squat": "Box Squat",
  "bench squat": "Kniebeuge zur Bank",
  lunge: "Ausfallschritte",
  lunges: "Ausfallschritte",
  "step-up": "Step-Ups",
  "step up": "Step-Ups",
  "step-ups": "Step-Ups",
  "calf raise": "Wadenheben",
  "heel raise": "Wadenheben",
  "toe raise": "Zehenheben",
  "toe touch": "Zehenberührung",
  "toe touchers": "Zehenberührung",
  "heel touchers": "Fersenberührung",
  "hip thrust": "Hip Thrust",
  "glute bridge": "Glute Bridge",
  "hip bridge": "Beckenheben",
  bridge: "Brücke",
  "hip abduction": "Abduktoren",
  "hip adduction": "Adduktoren",
  "leg abduction": "Abduktoren",
  "leg adduction": "Adduktoren",
  "hip extension": "Hüftstrecken",
  "hip flexion": "Hüftbeugen",
  "leg raise": "Beinheben",
  "leg raises": "Beinheben",
  "leg lift": "Beinheben",
  "leg lifting": "Beinheben",
  "knee raise": "Knieheben",
  "hip raise": "Beckenheben",
  "pelvic tilt": "Beckenkippen",
  "nordic hamstrings curl": "Nordic Curls",
  "box jump": "Box Jumps",
  "jump rope": "Seilspringen",
  "sled push": "Schlitten schieben",
  "sled drag": "Schlitten ziehen",
  "hip circle": "Hüftkreisen",
  "leg pull in": "Beinanziehen",
  "leg pull-in": "Beinanziehen",
  "frog press": "Frosch-Beinpresse",

  // Rumpf
  crunch: "Crunches",
  crunches: "Crunches",
  "reverse crunch": "Reverse Crunches",
  "oblique crunch": "Seitliche Crunches",
  "bicycle crunch": "Fahrrad-Crunches",
  "sit-up": "Sit-ups",
  "sit up": "Sit-ups",
  "sit-ups": "Sit-ups",
  situp: "Sit-ups",
  plank: "Plank",
  "side plank": "Side Plank",
  "side bend": "Seitbeugen",
  "side bent": "Seitbeugen",
  twist: "Rumpfdrehen",
  twists: "Rumpfdrehen",
  "russian twist": "Russian Twists",
  "russian twists": "Russian Twists",
  hyperextension: "Hyperextensions",
  "back extension": "Rückenstrecken",
  rollerout: "Ab-Wheel-Rollout",
  rollout: "Ab-Wheel-Rollout",
  "roll-out": "Ab-Wheel-Rollout",
  "flutter kick": "Flutter Kicks",
  "flutter kicks": "Flutter Kicks",
  "scissor kick": "Scherenschlag",
  "mountain climber": "Mountain Climber",
  "bird dog": "Bird Dog",
  "dead bug": "Dead Bug",
  windmill: "Windmill",
  burpee: "Burpees",
  burpees: "Burpees",
  "jumping jack": "Hampelmann",
  cocoons: "Cocoons",
  "butt-ups": "Butt-ups",
  "body-up": "Body-up",
  "bottoms-up": "Bottoms-up",
  "air bike": "Fahrrad-Crunches",
  "arm slingers": "Arm-Slinger",
  "otis up": "Otis-up",
  "gorilla chin": "Gorilla Chin",

  // Dehnen / Mobilität
  stretch: "Dehnung",
  "dynamic stretch": "Dynamische Dehnung",
  "wall slide": "Wandgleiten",
  "balance board": "Balance Board",
  "upward facing dog": "Herabschauender Hund (aufwärts)",
  "downward facing dog": "Herabschauender Hund",
  circles: "Kreisen",
  circle: "Kreisen",
  rotation: "Rotation",
  "range of motion": "Bewegungsradius",

  // Generische Verben — nur als Notnagel, wenn nichts Spezifischeres greift
  raise: "Heben",
  raises: "Heben",
  extension: "Strecken",
  flexion: "Beugen",
  abduction: "Abduktion",
  adduction: "Adduktion",
  hold: "Halten",
  hang: "Hängen",
  hangs: "Hängen",
  jump: "Sprünge",
  jumps: "Sprünge",
  throw: "Wurf",
  throws: "Wurf",
  walk: "Gehen",
  "walking lunge": "Ausfallschritte (gehend)",
  run: "Lauf",
  pull: "Ziehen",
  push: "Drücken",
  lift: "Heben",
  bend: "Beugen",
  kick: "Kick",
  kicks: "Kick",
  tap: "Tap",
  taps: "Tap",
  reach: "Strecken",
  pose: "Pose",
  slide: "Gleiten",
  drive: "Drive",
  flip: "Flip",
  roll: "Rollen",
  stand: "Stand",
  "pull through": "Pull Through",
  "glute-ham raise": "Glute-Ham Raise",
  "knee touch": "Knieberührung",
  "hip raise": "Beckenheben",
  "pallof press": "Pallof Press",
  "bradford press": "Bradford Press",
  "cuban rotation": "Kubanische Rotation",
  "rocky pull-up": "Rocky Pull-up",
  "world greatest stretch": "World's Greatest Stretch",
  "tuck crunch": "Tuck Crunch",
  "sit-up v. 2": "Sit-ups",
};

/** Zusätze — landen in der Reihenfolge des Originalnamens in der Klammer. */
const MODIFIER = {
  seated: "sitzend",
  standing: "stehend",
  lying: "liegend",
  supine: "liegend",
  prone: "bäuchlings",
  kneeling: "kniend",
  bent: "vorgebeugt",
  "bent over": "vorgebeugt",
  "bent-over": "vorgebeugt",
  incline: "Schrägbank",
  decline: "Negativbank",
  flat: "Flachbank",
  "one arm": "einarmig",
  "single arm": "einarmig",
  "one-arm": "einarmig",
  "two arm": "beidarmig",
  "one leg": "einbeinig",
  "single leg": "einbeinig",
  "one-leg": "einbeinig",
  "two legs": "beidbeinig",
  alternate: "alternierend",
  alternating: "alternierend",
  "close-grip": "eng",
  "close grip": "eng",
  close: "eng",
  narrow: "eng",
  "wide-grip": "breit",
  "wide grip": "breit",
  wide: "breit",
  "reverse-grip": "Untergriff",
  "reverse grip": "Untergriff",
  "revers grip": "Untergriff",
  underhand: "Untergriff",
  overhand: "Obergriff",
  "neutral grip": "neutraler Griff",
  neutral: "neutraler Griff",
  "parallel grip": "paralleler Griff",
  reverse: "umgekehrt",
  revers: "umgekehrt",
  inverse: "umgekehrt",
  inverted: "umgekehrt",
  overhead: "überkopf",
  "behind the neck": "hinter dem Nacken",
  "behind neck": "hinter dem Nacken",
  "behind head": "hinter dem Kopf",
  "behind back": "hinter dem Rücken",
  front: "vorne",
  rear: "hinten",
  back: "hinten",
  side: "seitlich",
  lateral: "seitlich",
  high: "hoch",
  "high pulley": "oberer Zug",
  "low pulley": "unterer Zug",
  low: "tief",
  hanging: "hängend",
  suspended: "hängend",
  weighted: "mit Zusatzgewicht",
  assisted: "assistiert",
  "self assisted": "selbst assistiert",
  twisting: "drehend",
  twisted: "gedreht",
  straight: "gestreckt",
  "straight arm": "gestreckte Arme",
  "straight back": "gerader Rücken",
  "straight leg": "gestreckte Beine",
  "straight legs": "gestreckte Beine",
  "bent knee": "gebeugte Knie",
  "bent knee legs": "gebeugte Knie",
  cross: "überkreuz",
  "cross body": "überkreuz",
  "cross-body": "überkreuz",
  double: "doppelt",
  single: "einzeln",
  full: "voll",
  half: "halb",
  "on exercise ball": "auf dem Gymnastikball",
  "on stability ball": "auf dem Gymnastikball",
  "exercise ball": "Gymnastikball",
  "stability ball": "Gymnastikball",
  "swiss ball": "Gymnastikball",
  "medicine ball": "Medizinball",
  "bosu ball": "Bosu-Ball",
  "on floor": "am Boden",
  floor: "am Boden",
  "on bench": "auf der Bank",
  bench: "auf der Bank",
  "on box": "auf der Box",
  box: "Box",
  wall: "an der Wand",
  chair: "am Stuhl",
  "parallel bars": "am Barren",
  bars: "am Barren",
  "v-bar": "V-Griff",
  "v bar": "V-Griff",
  "sz-bar": "SZ-Stange",
  "ez-bar": "SZ-Stange",
  "ez bar": "SZ-Stange",
  "palms in": "neutraler Griff",
  "palms-in": "neutraler Griff",
  "palm in": "neutraler Griff",
  "e-z bar": "SZ-Stange",
  rope: "Seil",
  towel: "mit Handtuch",
  "arm blaster": "Arm-Blaster",
  bar: "Stange",
  attachment: "Griff",
  handle: "Griff",
  grip: "Griff",
  support: "gestützt",
  supported: "gestützt",
  stabilization: "stabilisiert",
  dynamic: "dynamisch",
  static: "statisch",
  forward: "vorwärts",
  backward: "rückwärts",
  upward: "aufwärts",
  downward: "abwärts",
  up: "aufwärts",
  down: "abwärts",
  inner: "innen",
  outer: "außen",
  upper: "oben",
  lower: "unten",
  external: "außenrotiert",
  internal: "innenrotiert",
  "palm up": "Handfläche oben",
  "palm down": "Handfläche unten",
  "palms up": "Handflächen oben",
  "palms down": "Handflächen unten",
  extended: "gestreckt",
  raised: "erhöht",
  elevated: "erhöht",
  squatting: "in der Hocke",
  sumo: "Sumo",
  archer: "Archer",
  plyo: "plyometrisch",
  clap: "mit Klatschen",
  explosive: "explosiv",
  slow: "langsam",
  "on knees": "auf den Knien",
  frog: "Frosch",
  donkey: "Donkey",
  "hip flexor": "Hüftbeuger",
  hamstring: "Beinbeuger",
  hamstrings: "Beinbeuger",
  quads: "Quadrizeps",
  calf: "Wade",
  calves: "Waden",
  glute: "Gesäß",
  glutes: "Gesäß",
  groin: "Leiste",
  chest: "Brust",
  shoulder: "Schulter",
  neck: "Nacken",
  lat: "Latissimus",
  lats: "Latissimus",
  delt: "Deltamuskel",
  deltoid: "Deltamuskel",
  biceps: "Bizeps",
  bicep: "Bizeps",
  triceps: "Trizeps",
  tricep: "Trizeps",
  forearm: "Unterarm",
  abs: "Bauch",
  oblique: "seitliche Bauchmuskeln",
  obliques: "seitliche Bauchmuskeln",
  spine: "Wirbelsäule",
  hip: "Hüfte",
  knee: "Knie",
  knees: "Knie",
  leg: "Bein",
  legs: "Beine",
  arm: "Arm",
  arms: "Arme",
  hand: "Hand",
  hands: "Hände",
  toe: "Zehen",
  heel: "Ferse",
  head: "Kopf",
  elbow: "Ellbogen",
  wrist: "Handgelenk",
  ankle: "Knöchel",
  stance: "Stand",
  "45°": "45°",
  "90°": "90°",
  "45 degrees": "45°",
  vertical: "vertikal",
  horizontal: "horizontal",
  circular: "kreisend",
  apart: "gespreizt",
  together: "geschlossen",
  // Bedeutungslos für uns — der Datensatz markiert damit Modell und Kameraposition
  male: null,
  female: null,
  pov: null,
  exercise: null,
  version: null,
  the: null,
  and: null,
  with: null,
  on: null,
  to: null,
  in: null,
  of: null,
  a: null,
  from: null,
  at: null,
  for: null,
  your: null,
  or: null,
  "over a bench": "auf der Bank",
  "over bench": "auf der Bank",
  "over head": "überkopf",
  "over the head": "überkopf",
  "one hand": "einhändig",
  "two hands": "beidhändig",
  "hammer grip": "Hammergriff",
  hammer: "Hammer",
  "palm-in": "neutraler Griff",
  "palms-in": "neutraler Griff",
  "stiff leg": "gestreckte Beine",
  "stiff legs": "gestreckte Beine",
  variation: "Variante",
  modified: "abgewandelt",
  "chest pad": "Brustpolster",
  staircase: "an der Treppe",
  "on a staircase": "an der Treppe",
  step: "auf dem Step",
  "knees off ground": "Knie angehoben",
  "off ground": "angehoben",
  "leg-hip": "Bein und Hüfte",
  "all fours": "Vierfüßlerstand",
  "on all fours": "Vierfüßlerstand",
  scapula: "Schulterblatt",
  scapular: "Schulterblatt",
  piriformis: "Piriformis",
  pectoralis: "Brustmuskel",
  "pectoralis major": "großer Brustmuskel",
  "rectus femoris": "Rectus femoris",
  gluteus: "Gesäßmuskel",
  adductor: "Adduktoren",
  abductor: "Abduktoren",
  "hip flexors": "Hüftbeuger",
  posterior: "hinten",
  anterior: "vorne",
  "fixed bar": "feste Stange",
  fixed: "fest",
  gripless: "ohne Griff",
  sitted: "sitzend",
  rocking: "wippend",
  rotational: "rotierend",
  clasped: "verschränkt",
  "cage": "im Rack",
  tennis: "Tennis",
  stork: "Storch",
  "between benches": "zwischen Bänken",
  between: "zwischen",
  through: "durch",
  "3/4": "3/4",
  three: "drei",
  drop: "Drop",
  wheel: "Ab-Wheel",
  pec: "Brustmuskel",
  "response ball": "Gymnastikball",
  "potty squat": "tiefe Hocke",
  "depresor": "Senker",
  "retractor": "Retraktion",
};

const EQUIPMENT_LABEL = {
  barbell: "Langhantel",
  dumbbell: "Kurzhantel",
  machine: "Maschine",
  cable: "Kabelzug",
  bodyweight: null, // Eigengewicht braucht keinen Zusatz
  kettlebell: "Kettlebell",
  band: "Band",
  ball: "Ball",
  other: null,
};

const MAX_NGRAM = 4;

function normalize(raw) {
  return raw
    .toLowerCase()
    .replace(/в°/g, "°") // vier Namen im Quelldatensatz sind falsch kodiert
    .replace(/\bv\.\s*(\d)/g, "variante$1")
    .replace(/[(),_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Läuft einmal von links nach rechts und nimmt an jeder Stelle den längsten
 * Treffer aus Kern- oder Zusatz-Wörterbuch. Dadurch bleibt die Reihenfolge der
 * Zusätze die des Originalnamens.
 */
export function translateName(rawName, equipment) {
  const words = normalize(rawName).split(" ").filter(Boolean);
  let core = null;
  const mods = [];
  const rest = [];
  const extraCores = [];

  let i = 0;
  while (i < words.length) {
    let hit = null;
    for (let n = Math.min(MAX_NGRAM, words.length - i); n >= 1; n--) {
      const gram = words.slice(i, i + n).join(" ");
      if (gram in CORE) {
        hit = { n, kind: "core", value: CORE[gram] };
        break;
      }
      if (gram in MODIFIER) {
        hit = { n, kind: "mod", value: MODIFIER[gram] };
        break;
      }
    }

    if (!hit) {
      const word = words[i];
      const variante = word.match(/^variante(\d)$/);
      if (variante) mods.push(`Variante ${variante[1]}`);
      else if (!EQUIPMENT_WORDS.has(word)) rest.push(word);
      i += 1;
      continue;
    }

    if (hit.kind === "core") {
      if (core === null) core = hit.value;
      else extraCores.push(hit.value);
    } else if (hit.value && !mods.includes(hit.value)) {
      mods.push(hit.value);
    }
    i += hit.n;
  }

  // Ohne erkannte Kernbewegung bleibt der Originalname stehen — nur ohne das
  // Gerät, das gleich in der Klammer steht. Die einzeln übersetzten Zusätze
  // fallen dann weg: sie stünden sonst ein zweites Mal daneben.
  if (core === null) {
    const eq = EQUIPMENT_LABEL[equipment];
    const plain = capitalize(
      normalize(rawName)
        .split(" ")
        .filter((w) => !EQUIPMENT_WORDS.has(w))
        .join(" ")
    );
    return {
      name: eq ? `${plain} (${eq})` : plain,
      core: null,
      rest: [],
      translated: false,
    };
  }

  const head = core;
  const parts = [...mods, ...extraCores, ...rest.map(capitalize)];

  // Schrägbank und Negativbank verschmelzen im Deutschen mit der Bewegung.
  const fuse = (h, mod) => {
    const at = parts.indexOf(mod);
    if (at === -1 || h.startsWith(mod) || h.includes(" ")) return h;
    parts.splice(at, 1);
    // "Schrägbankdrücken" ist ein Wort, "Schrägbank-Fliegende" braucht den Strich.
    if (h === "Drücken") return mod + "drücken";
    if (h === "Bankdrücken") return mod + "drücken";
    return `${mod}-${h}`;
  };
  let name = fuse(head, "Schrägbank");
  name = fuse(name, "Negativbank");

  const eqLabel = EQUIPMENT_LABEL[equipment];
  const alreadyNamed = parts.some((p) => p.toLowerCase().includes(eqLabel?.toLowerCase() ?? "\u0000"));
  if (eqLabel && !alreadyNamed) parts.push(eqLabel);

  // Steht der Kern schon mit Klammer da ("Dips (brustbetont)"), wird die
  // zweite Klammer hineingezogen statt danebengesetzt.
  let label;
  const open = name.indexOf(" (");
  if (open !== -1 && name.endsWith(")")) {
    const inner = name.slice(open + 2, -1);
    const merged = [inner, ...parts].join(", ");
    label = `${name.slice(0, open)} (${merged})`;
  } else {
    label = parts.length ? `${name} (${parts.join(", ")})` : name;
  }

  return {
    name: label.replace(/\s+/g, " ").trim(),
    core,
    rest,
    translated: core !== null && rest.length === 0,
  };
}

function capitalize(w) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}
