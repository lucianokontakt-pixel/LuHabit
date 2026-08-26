/**
 * Die 90 Übungen der alten, selbst gepflegten Bibliothek auf ihre Entsprechung
 * im openGym-Katalog. Gebraucht an zwei Stellen:
 *
 *   - Migration 0018 schreibt damit `plan_exercises` und `workout_sets` um,
 *     damit fertige Pläne und die Trainingshistorie den Wechsel überstehen.
 *   - Die Split-Vorlagen in lib/exercise-seed.ts nennen ihre Übungen weiterhin
 *     unter den alten Namen; SPLIT_TEMPLATES löst sie darüber auf.
 *
 * Die Zuordnung ist von Hand geprüft: jede alte Übung zeigt auf die Übung, die
 * dieselbe Bewegung beschreibt — nicht auf eine ähnliche. Wo der Katalog keine
 * Entsprechung hat (Nordic Curls, Hip Thrust, Plank), steht null: die Übung
 * fällt weg. Referenziert ein Plan sie trotzdem, lässt die Migration die Zeile
 * unangetastet stehen, statt sie auf etwas Falsches zu biegen.
 */
export const LEGACY_EXERCISE_MAP: Record<string, string | null> = {
  // Brust
  "bankdruecken-lh": "og-0025", // barbell bench press
  "schraegbank-lh": "og-0047", // barbell incline bench press
  "negativbank-lh": "og-0033", // barbell decline bench press
  "bankdruecken-kh": "og-0289", // dumbbell bench press
  "schraegbank-kh": "og-0314", // dumbbell incline bench press
  "fliegende-kh": "og-0308", // dumbbell fly
  "schraegbank-fliegende": "og-0319", // dumbbell incline fly
  butterfly: "og-0596", // lever seated fly
  brustpresse: "og-0577", // lever chest press
  "kabelzug-fliegende": "og-0227", // cable standing fly
  "dips-brust": "og-0251", // chest dip
  liegestuetze: "og-0662", // push-up
  "schraegbank-multipresse": "og-0757", // smith incline bench press

  // Rücken
  kreuzheben: "og-0032", // barbell deadlift
  "rack-pulls": "og-0074", // barbell rack pull
  langhantelrudern: "og-0027", // barbell bent over row
  "t-bar-rudern": "og-0606", // lever t bar row
  kurzhantelrudern: "og-0292", // dumbbell one arm bent-over row
  klimmzuege: "og-0652", // pull-up
  "latzug-breit": "og-0198", // cable pulldown
  "latzug-eng": "og-0245", // cable underhand pulldown
  "rudern-kabel": "og-0861", // cable seated row
  rudermaschine: "og-1350", // lever seated row
  "ueberzuege-kabel": "og-0238", // cable straight arm pulldown
  hyperextensions: "og-0489", // hyperextension
  "shrugs-kh": "og-0406", // dumbbell shrug
  "shrugs-lh": "og-0095", // barbell shrug

  // Schultern
  "schulterdruecken-lh": "og-0091", // barbell seated overhead press
  "schulterdruecken-kh": "og-0405", // dumbbell seated shoulder press
  "schulterpresse-maschine": "og-0603", // lever shoulder press
  "arnold-press": "og-2137", // dumbbell arnold press
  "seitheben-kh": "og-0334", // dumbbell lateral raise
  "seitheben-kabel": "og-0178", // cable lateral raise
  "frontheben-kh": "og-0310", // dumbbell front raise
  "vorgebeugtes-seitheben": "og-0380", // dumbbell rear lateral raise
  "reverse-butterfly": "og-0602", // lever seated reverse fly
  "face-pulls": "og-0203", // cable rear delt row (with rope)
  "aufrechtes-rudern": "og-0120", // barbell upright row

  // Bizeps
  langhantelcurls: "og-0031", // barbell curl
  "sz-curls": "og-0447", // ez barbell curl
  kurzhantelcurls: "og-0294", // dumbbell biceps curl
  hammercurls: "og-0313", // dumbbell hammer curl
  scottcurls: "og-0070", // barbell preacher curl
  kabelcurls: "og-0868", // cable curl
  konzentrationscurls: "og-0297", // dumbbell concentration curl
  "reverse-curls": "og-0080", // barbell reverse curl
  curlmaschine: "og-0592", // lever preacher curl

  // Trizeps
  engbankdruecken: "og-0030", // barbell close-grip bench press
  "dips-trizeps": "og-0814", // triceps dip
  bankdips: "og-0129", // bench dip (knees bent)
  "trizepsdruecken-kabel": "og-0201", // cable pushdown
  "trizepsdruecken-seil": "og-0200", // cable pushdown (with rope attachment)
  "french-press": "og-1749", // ez bar standing french press
  "overhead-trizeps-kh": "og-0092", // barbell seated overhead triceps extension
  kickbacks: "og-0333", // dumbbell kickback
  dipmaschine: "og-0591", // lever overhand triceps dip

  // Quadrizeps
  kniebeugen: "og-0043", // barbell full squat
  frontkniebeugen: "og-0042", // barbell front squat
  "multipresse-kniebeuge": "og-0770", // smith squat
  beinpresse: "og-0739", // sled 45° leg press
  hackenschmidt: "og-0743", // sled hack squat
  beinstrecker: "og-0585", // lever leg extension
  "ausfallschritte-kh": "og-0336", // dumbbell lunge
  "bulgarian-split-squat": "og-0410", // dumbbell single leg split squat
  "goblet-squat": "og-1760", // dumbbell goblet squat
  "step-ups": "og-0431", // dumbbell step-up
  "sissy-squat": "og-1489", // sissy squat

  // Beinbeuger
  "rumaenisches-kreuzheben": "og-0085", // barbell romanian deadlift
  "rumaenisches-kreuzheben-kh": "og-1459", // dumbbell romanian deadlift
  "beinbeuger-liegend": "og-0586", // lever lying leg curl
  "beinbeuger-sitzend": "og-0599", // lever seated leg curl
  "good-mornings": "og-0044", // barbell good morning
  "nordic-curls": null, // im Katalog nicht enthalten

  // Gesäß
  "hip-thrust": null, // im Katalog nur als Band-Variante, nicht vergleichbar
  "glute-bridge": "og-1409", // barbell glute bridge
  "glute-kickbacks-kabel": "og-0228", // cable standing hip extension
  abduktoren: "og-0597", // lever seated hip abduction
  adduktoren: "og-0598", // lever seated hip adduction

  // Waden
  "wadenheben-stehend": "og-0605", // lever standing calf raise
  "wadenheben-sitzend": "og-0594", // lever seated calf raise
  "wadenheben-beinpresse": "og-1391", // sled calf press on leg press
  "wadenheben-kh": "og-0417", // dumbbell standing calf raise

  // Rumpf
  crunches: "og-0274", // crunch floor
  "beinheben-haengend": "og-0472", // hanging leg raise
  plank: null, // im Katalog nur mit Zusätzen, kein schlichter Plank
  "side-plank": null,
  "russian-twists": "og-0687", // russian twist
  "kabel-crunches": "og-0175", // cable kneeling crunch
  "ab-wheel": "og-0857", // wheel rollerout
  bauchmaschine: "og-1452", // lever seated crunch
};

/**
 * Startgewicht- und Volumenfaktoren, die in der alten Bibliothek von Hand
 * eingestellt waren. Der openGym-Katalog kennt so etwas nicht — ohne diese
 * Tabelle stünde die App bei genau den Übungen ohne Vorschlag da, für die sie
 * bisher einen hatte.
 *
 * `factor` schätzt das Arbeitsgewicht als Anteil des Körpergewichts,
 * `load` den Anteil des Körpergewichts, den die Übung fürs Volumen bewegt.
 */
export const CATALOG_DEFAULTS: Record<
  string,
  { factor: number | null; load?: number | null }
> = {
  "og-0025": { factor: 0.6 }, // Bankdrücken (Langhantel)
  "og-0047": { factor: 0.5 }, // Schrägbankdrücken (Langhantel)
  "og-0033": { factor: 0.55 }, // Negativbankdrücken (Langhantel)
  "og-0289": { factor: 0.22 }, // Bankdrücken (Kurzhantel)
  "og-0314": { factor: 0.18 }, // Schrägbankdrücken (Kurzhantel)
  "og-0308": { factor: 0.1 }, // Fliegende (Kurzhantel)
  "og-0319": { factor: 0.09 }, // Schrägbank-Fliegende (Kurzhantel)
  "og-0596": { factor: 0.35 }, // Fliegende (sitzend, Maschine)
  "og-0577": { factor: 0.5 }, // Brustpresse (Maschine)
  "og-0227": { factor: 0.12 }, // Fliegende (stehend, Kabelzug)
  "og-0251": { factor: null, load: 0.95 }, // Dips (brustbetont)
  "og-0662": { factor: null, load: 0.65 }, // Liegestütze
  "og-0757": { factor: 0.45 }, // Schrägbankdrücken (Maschine)
  "og-0032": { factor: 1.0 }, // Kreuzheben (Langhantel)
  "og-0074": { factor: 1.1 }, // Rack Pulls (Langhantel)
  "og-0027": { factor: 0.5 }, // Vorgebeugtes Rudern (Langhantel)
  "og-0606": { factor: 0.45 }, // T-Bar-Rudern (Maschine)
  "og-0292": { factor: 0.25 }, // Vorgebeugtes Rudern (einarmig, Kurzhantel)
  "og-0652": { factor: null, load: 1.0 }, // Klimmzüge
  "og-0198": { factor: 0.55 }, // Latzug (Kabelzug)
  "og-0245": { factor: 0.55 }, // Latzug (Untergriff, Kabelzug)
  "og-0861": { factor: 0.55 }, // Rudern (sitzend, Kabelzug)
  "og-1350": { factor: 0.55 }, // Rudern (sitzend, Maschine)
  "og-0238": { factor: 0.3 }, // Latzug (gestreckte Arme, Kabelzug)
  "og-0489": { factor: null, load: 0.5 }, // Hyperextensions
  "og-0406": { factor: 0.3 }, // Shrugs (Kurzhantel)
  "og-0095": { factor: 0.5 }, // Shrugs (Langhantel)
  "og-0091": { factor: 0.4 }, // Überkopfdrücken (sitzend, Langhantel)
  "og-0405": { factor: 0.15 }, // Schulterdrücken (sitzend, Kurzhantel)
  "og-0603": { factor: 0.4 }, // Schulterdrücken (Maschine)
  "og-2137": { factor: 0.14 }, // Arnold Press (Kurzhantel)
  "og-0334": { factor: 0.08 }, // Seitheben (Kurzhantel)
  "og-0178": { factor: 0.08 }, // Seitheben (Kabelzug)
  "og-0310": { factor: 0.08 }, // Frontheben (Kurzhantel)
  "og-0380": { factor: 0.07 }, // Vorgebeugtes Seitheben (Kurzhantel, Variante 2)
  "og-0602": { factor: 0.25 }, // Reverse Butterfly (sitzend, Maschine)
  "og-0203": { factor: 0.25 }, // Vorgebeugtes Rudern (Seil, Kabelzug)
  "og-0120": { factor: 0.3 }, // Aufrechtes Rudern (Langhantel)
  "og-0031": { factor: 0.3 }, // Curls (Langhantel)
  "og-0447": { factor: 0.28 }, // SZ-Curls (Langhantel)
  "og-0294": { factor: 0.12 }, // Bizeps-Curls (Kurzhantel)
  "og-0313": { factor: 0.13 }, // Hammercurls (Kurzhantel)
  "og-0070": { factor: 0.22 }, // Scott-Curls (Langhantel)
  "og-0868": { factor: 0.25 }, // Curls (Kabelzug)
  "og-0297": { factor: 0.1 }, // Konzentrationscurls (Kurzhantel)
  "og-0080": { factor: 0.2 }, // Curls (umgekehrt, Langhantel)
  "og-0592": { factor: 0.25 }, // Scott-Curls (Maschine)
  "og-0030": { factor: 0.45 }, // Bankdrücken (eng, Langhantel)
  "og-0814": { factor: null, load: 0.95 }, // Dips (trizepsbetont)
  "og-0129": { factor: null, load: 0.4 }, // Bankdips (Knie, vorgebeugt)
  "og-0201": { factor: 0.3 }, // Trizepsdrücken (Kabelzug)
  "og-0200": { factor: 0.25 }, // Trizepsdrücken (Seil, Griff, Kabelzug)
  "og-1749": { factor: 0.2 }, // French Press (SZ-Stange, stehend, Langhantel)
  "og-0092": { factor: 0.15 }, // Trizepsstrecken (sitzend, überkopf, Langhantel)
  "og-0333": { factor: 0.08 }, // Kickbacks (Kurzhantel)
  "og-0591": { factor: 0.4 }, // Dips (trizepsbetont, Obergriff, Maschine)
  "og-0043": { factor: 0.75 }, // Kniebeugen (voll, Langhantel)
  "og-0042": { factor: 0.55 }, // Frontkniebeugen (Langhantel)
  "og-0770": { factor: 0.7 }, // Kniebeugen (Maschine)
  "og-0739": { factor: 1.5 }, // Beinpresse (45°, Maschine)
  "og-0743": { factor: 0.9 }, // Hackenschmidt-Kniebeuge (Maschine)
  "og-0585": { factor: 0.5 }, // Beinstrecker (Maschine)
  "og-0336": { factor: 0.2 }, // Ausfallschritte (Kurzhantel)
  "og-0410": { factor: 0.2 }, // Split Squat (einbeinig, Kurzhantel)
  "og-1760": { factor: 0.3 }, // Goblet Squat (Kurzhantel)
  "og-0431": { factor: 0.15 }, // Step-Ups (Kurzhantel)
  "og-1489": { factor: null, load: 0.6 }, // Sissy Squat
  "og-0085": { factor: 0.7 }, // Rumänisches Kreuzheben (Langhantel)
  "og-1459": { factor: 0.3 }, // Rumänisches Kreuzheben (Kurzhantel)
  "og-0586": { factor: 0.35 }, // Beinbeuger (liegend, Maschine)
  "og-0599": { factor: 0.4 }, // Beinbeuger (sitzend, Maschine)
  "og-0044": { factor: 0.4 }, // Good Mornings (Langhantel)
  "og-1409": { factor: 0.7 }, // Glute Bridge (Langhantel)
  "og-0228": { factor: 0.15 }, // Hüftstrecken (stehend, Kabelzug)
  "og-0597": { factor: 0.4 }, // Abduktoren (sitzend, Maschine)
  "og-0598": { factor: 0.4 }, // Adduktoren (sitzend, Maschine)
  "og-0605": { factor: 0.8 }, // Wadenheben (stehend, Maschine)
  "og-0594": { factor: 0.5 }, // Wadenheben (sitzend, Maschine)
  "og-1391": { factor: 1.0 }, // Wadenpresse (Beinpresse, Maschine)
  "og-0417": { factor: 0.3 }, // Wadenheben (stehend, Kurzhantel)
  "og-0274": { factor: null, load: 0.3 }, // Crunches (am Boden)
  "og-0472": { factor: null, load: 0.45 }, // Beinheben (hängend)
  "og-0687": { factor: 0.1 }, // Russian Twists
  "og-0175": { factor: 0.3 }, // Crunches (kniend, Kabelzug)
  "og-0857": { factor: null, load: 0.4 }, // Ab-Wheel-Rollout (Ab-Wheel)
  "og-1452": { factor: 0.35 }, // Crunches (sitzend, Maschine)
};
