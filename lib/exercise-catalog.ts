import catalogData from "@/lib/exercise-catalog.json";
import {
  CUSTOM_RANK,
  DEFAULT_BODYWEIGHT_LOAD,
  type Equipment,
  type Exercise,
  type Kategorie,
  type Ladeart,
  type Mechanik,
  type Muscle,
  type Region,
  type Schwierigkeit,
  type ZugArt,
} from "@/lib/training";

/**
 * Die Übungsbibliothek. Sie steht bewusst nicht in der Datenbank: sie ist für
 * alle Nutzer gleich, ändert sich nur mit einer neuen Version der App und wäre
 * als 601 Zeilen pro Nutzer bei jedem Abgleich unnötiger Ballast. Erzeugt von
 * scripts/build-repdb-katalog.mjs aus dem RepDB-Datensatz (data/repdb/).
 *
 * In der Tabelle `exercises` steht darum nur noch, was jemand selbst angelegt
 * oder an einer Katalogübung verstellt hat. `mergeExercises` legt beides
 * übereinander — davor sieht der Rest der App wie bisher eine flache Liste.
 *
 * Vieles hier stand bis zum Wechsel auf RepDB als Vermutung im Katalog: die
 * Region kam aus einem Namensregex, die Beliebtheitsstufe aus dem Gerät, die
 * Ladeart aus Handarbeit an 145 Maschinen, die deutschen Namen aus einem
 * Wörterbuch, das nur die Suche kannte. Jetzt steht alles davon im Datensatz.
 */
export type CatalogExercise = {
  id: string;
  /** Der deutsche Name — die Bibliothek heißt, wie man sie im Studio nennt. */
  name: string;
  /** Der englische Name. Zweitname für die Suche und für Nutzer, die so suchen. */
  nameEn: string;
  muscle: Muscle;
  equipment: Equipment;
  secondary: Muscle[];
  /**
   * Der Dateiname der Bilder, ohne Endung und ohne `-start`/`-peak`. Meist
   * gleich der ID, aber nicht immer: ein Dutzend Übungen teilt sich die
   * Illustration mit einer Schwesterübung.
   */
  media: string;
  /** Welche Bilder es gibt: zwei Positionen oder nur eine. */
  bilder: ("start" | "peak" | "main")[];
  /**
   * Das genaue Gerät aus dem Datensatz ("leg_press", "smith_machine") — 55
   * Werte, die `equipment` auf neun zusammenfasst. Hier, weil zu jedem ein
   * Bild gehört (geraetBildUrl) und weil die Ladeart daran hängt. null bei
   * Übungen ohne Gerät.
   */
  geraetKuerzel: string | null;
  /** Untergruppe innerhalb der Muskelgruppe — null, wo es keine gibt. */
  region: Region | null;
  /** Wie üblich die Übung ist, 1–5. Sortiert die Suche und blendet unten aus. */
  rank: number;
  /**
   * Womit man anfängt, als Anteil des Körpergewichts — geschätzt in
   * scripts/exercise-startgewicht.mjs. null heißt Eigengewicht: dort ist das
   * Gewicht der Körper und es gibt nichts zu schätzen.
   */
  startFactor: number | null;
  /**
   * Wie das Gewicht an das Gerät kommt. Aus dem Gerät abgeleitet (siehe
   * scripts/repdb-zuordnung.mjs) — RepDB benennt Scheiben- und
   * Steckmaschinen einzeln, das musste vorher jemand von Hand nachtragen.
   * Die persönliche Ladeart in der Datenbank schlägt diesen Wert weiterhin:
   * dieselbe Maschine steht im einen Studio mit Block, im anderen mit
   * Scheiben.
   */
  ladeart: Ladeart | null;

  kategorie: Kategorie;
  /** Mehrgelenkig oder eingelenkig — entscheidet über Aufwärmsätze. */
  mechanik: Mechanik;
  /** Drücken oder Ziehen. Trägt die Push/Pull-Einteilung eines Splits. */
  zugArt: ZugArt;
  schwierigkeit: Schwierigkeit;

  /** Die genauen Muskeln, nicht nur die Gruppe. */
  primaerMuskeln: string[];
  sekundaerMuskeln: string[];

  /**
   * Die Bewegungsfamilie: alle Kniebeugen tragen "squat", alle Ruderzüge
   * "row". Das ist die Auskunft, an der die Wechsel-Vorschläge in der
   * laufenden Einheit hängen — vorher wurde sie aus Muskel, Region und
   * Namensähnlichkeit geraten und traf zu oft daneben.
   */
  variationsgruppe: string | null;
  einseitig: boolean;
  eigengewicht: boolean;
  /** Metabolisches Äquivalent — Grundlage für eine Kalorienschätzung. */
  met: number;
  ziele: string[];
  tags: string[];
};

export const CATALOG = catalogData as CatalogExercise[];

const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

export function catalogEntry(id: string): CatalogExercise | undefined {
  return BY_ID.get(id);
}

/** Wie eine Übung in der Datenbank liegt: entweder eigen oder eine Abweichung. */
export type ExerciseRecord = {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  isCustom: boolean;
  hidden: boolean;
  favorite: boolean;
  increment: number | null;
  bodyweightFactor: number | null;
  loadFactor: number | null;
  warmup: "always" | "never" | null;
  /** Selbst vergebene Beliebtheitsstufe, oder null für die aus dem Katalog. */
  rating: number | null;
  /** Selbst festgelegte Ladeart, oder null für die abgeleitete. */
  ladeart: Ladeart | null;
};

/** Eine Katalogübung so, wie sie ohne jede Anpassung aussieht. */
export function fromCatalog(entry: CatalogExercise): Exercise {
  return {
    id: entry.id,
    name: entry.name,
    muscle: entry.muscle,
    equipment: entry.equipment,
    isCustom: false,
    hidden: false,
    favorite: false,
    increment: null,
    // Hier stand bis zum Wechsel auf RepDB eine Tabelle von Hand gepflegter
    // Werte für 90 Übungen (CATALOG_DEFAULTS), die die Schätzung schlug. Sie
    // war auf die alten IDs geschlüsselt und mit ihnen hinfällig; der
    // Startfaktor kommt jetzt für alle 601 aus derselben Rechnung
    // (scripts/exercise-startgewicht.mjs), die damals an ihr geeicht wurde.
    bodyweightFactor: entry.startFactor,
    loadFactor: entry.equipment === "bodyweight" ? DEFAULT_BODYWEIGHT_LOAD : null,
    warmup: null,
    media: entry.media,
    bilder: entry.bilder,
    geraetKuerzel: entry.geraetKuerzel,
    secondary: entry.secondary,
    en: entry.nameEn,
    region: entry.region,
    rank: entry.rank,
    rating: null,
    ladeart: entry.ladeart ?? null,
    kategorie: entry.kategorie,
    mechanik: entry.mechanik,
    zugArt: entry.zugArt,
    schwierigkeit: entry.schwierigkeit,
    primaerMuskeln: entry.primaerMuskeln,
    sekundaerMuskeln: entry.sekundaerMuskeln,
    variationsgruppe: entry.variationsgruppe,
    einseitig: entry.einseitig,
    met: entry.met,
    ziele: entry.ziele,
    tags: entry.tags,
  };
}

/**
 * Was eine Zeile mitbekommt, zu der es keinen Katalogeintrag gibt: eigene
 * Übungen und Reste aus der alten Bibliothek. Kein Bild, keine Nebenmuskeln,
 * kein englischer Name, keine Region — und die volle Beliebtheitsstufe, damit
 * eine selbst angelegte Übung nie im ausgeblendeten Teil landet.
 *
 * Die beschreibenden Felder bleiben leer statt geraten: eine selbst angelegte
 * Übung hat keine Anleitung, und eine erfundene wäre schlimmer als keine.
 */
export function ohneKatalog(): Omit<
  Exercise,
  | "id" | "name" | "muscle" | "equipment" | "isCustom" | "hidden" | "favorite"
  | "increment" | "bodyweightFactor" | "loadFactor" | "warmup" | "rating" | "ladeart"
> {
  // Jedes Mal ein frisches Objekt: ein geteiltes `secondary`-Array wäre eines,
  // das sich eine Übung mit allen anderen teilt.
  return {
    media: null,
    bilder: [],
    geraetKuerzel: null,
    secondary: [],
    en: null,
    region: null,
    rank: CUSTOM_RANK,
    kategorie: null,
    mechanik: null,
    zugArt: null,
    schwierigkeit: null,
    primaerMuskeln: [],
    sekundaerMuskeln: [],
    variationsgruppe: null,
    einseitig: false,
    met: null,
    ziele: [],
    tags: [],
  };
}

/**
 * Katalog plus die Zeilen aus der Datenbank. Eine Zeile zu einer Katalog-ID
 * überschreibt deren Werte, jede andere Zeile ist eine eigene Übung.
 *
 * Zeilen, deren ID der Katalog nicht kennt und die nicht als eigene Übung
 * markiert sind, kommen trotzdem mit: das sind Reste aus der alten Bibliothek,
 * für die die Migration keine Entsprechung gefunden hat. Sie stillschweigend
 * zu verschlucken hieße, dass ein Plan auf eine Übung zeigt, die es nirgends
 * mehr gibt.
 */
export function mergeExercises(records: ExerciseRecord[]): Exercise[] {
  const overrides = new Map(records.map((r) => [r.id, r]));
  const merged: Exercise[] = [];

  for (const entry of CATALOG) {
    const base = fromCatalog(entry);
    const row = overrides.get(entry.id);
    if (!row) {
      merged.push(base);
      continue;
    }
    overrides.delete(entry.id);
    merged.push({
      ...base,
      name: row.name,
      muscle: row.muscle,
      equipment: row.equipment,
      hidden: row.hidden,
      favorite: row.favorite,
      increment: row.increment,
      bodyweightFactor: row.bodyweightFactor ?? base.bodyweightFactor,
      loadFactor: row.loadFactor ?? base.loadFactor,
      warmup: row.warmup,
      rating: row.rating,
      // Die persönliche Ladeart schlägt die aus dem Katalog — nicht
      // umgekehrt: row.ladeart ist null, solange niemand widerspricht.
      ladeart: row.ladeart ?? base.ladeart,
    });
  }

  for (const row of overrides.values()) {
    merged.push({ ...row, ...ohneKatalog() });
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Eine einzelne Zeile zusammenlegen, ohne über den ganzen Katalog zu laufen. */
export function mergeOne(record: ExerciseRecord): Exercise {
  const entry = BY_ID.get(record.id);
  if (!entry) return { ...record, ...ohneKatalog() };
  const base = fromCatalog(entry);
  return {
    ...base,
    name: record.name,
    muscle: record.muscle,
    equipment: record.equipment,
    hidden: record.hidden,
    favorite: record.favorite,
    increment: record.increment,
    bodyweightFactor: record.bodyweightFactor ?? base.bodyweightFactor,
    loadFactor: record.loadFactor ?? base.loadFactor,
    warmup: record.warmup,
    rating: record.rating,
    ladeart: record.ladeart ?? base.ladeart,
  };
}

const MEDIA_BASE = "/uebungen";

/** Welche Position eines Bewegungsablaufs gemeint ist. */
export type Bildart = "start" | "peak" | "main";

/**
 * Ein Bild der Übung, oder null bei einer eigenen Übung.
 *
 * Zwei Positionen statt eines GIFs: der Datensatz zeigt Anfang und Umkehrpunkt
 * jeder Bewegung einzeln, in 512 statt 180 px. Zusammen sind das 19 MB für die
 * ganze Bibliothek — die animierte Fassung wog 122 MB und passte damit nie
 * aufs Handy. Wo es nur ein Bild gibt, heißt es "main".
 */
export function bildUrl(
  exercise: { media: string | null; bilder: Bildart[] },
  art: Bildart = "start"
): string | null {
  if (!exercise.media || exercise.bilder.length === 0) return null;
  const gewaehlt = exercise.bilder.includes(art) ? art : exercise.bilder[0];
  return `${MEDIA_BASE}/repdb/flat/${exercise.media}-${gewaehlt}.webp`;
}

/**
 * Beschreibung, Anleitung und Tipps.
 *
 * Sie liegen getrennt vom Katalog, weil sie mit 450 KB schwerer sind als er
 * selbst und nur gebraucht werden, wenn jemand eine einzelne Übung aufschlägt.
 * Ein Abruf holt sie für die ganze Bibliothek; der Service Worker legt die
 * Datei danach ab, damit sie auch ohne Netz da ist.
 */
export type Uebungstext = {
  beschreibung: string;
  anleitung: string[];
  tipps: string[];
};

/** Derselbe Text in beiden Sprachen, die die App führt. */
export type Uebungstexte = { de: Uebungstext; en: Uebungstext };

export const TEXTE_URL = `${MEDIA_BASE}/texte.json`;

let texteCache: Record<string, Uebungstexte> | null = null;

export async function ladeUebungstext(
  id: string,
  sprache: "de" | "en" = "de"
): Promise<Uebungstext | null> {
  if (!texteCache) {
    try {
      const response = await fetch(TEXTE_URL);
      texteCache = response.ok ? ((await response.json()) as Record<string, Uebungstexte>) : {};
    } catch {
      // Ohne Netz und ohne Zwischenspeicher gibt es keine Anleitung — die
      // Übung bleibt trotzdem benutzbar, also still bleiben statt werfen.
      texteCache = {};
    }
  }
  return texteCache[id]?.[sprache] ?? null;
}

/**
 * Das Bild eines Geräts — 55 Illustrationen, eine je RepDB-Gerät.
 * null, wo die Übung kein Gerät braucht.
 */
export function geraetBildUrl(exercise: { geraetKuerzel?: string | null }): string | null {
  if (!exercise.geraetKuerzel) return null;
  return `${MEDIA_BASE}/repdb/geraete/${exercise.geraetKuerzel.replace(/_/g, "-")}.webp`;
}

/** Das Bild eines Muskels — 27 Illustrationen, eine je RepDB-Muskel. */
export function muskelBildUrl(muskel: string): string {
  return `${MEDIA_BASE}/repdb/muskeln/${muskel.replace(/_/g, "-")}.webp`;
}
