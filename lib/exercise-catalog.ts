import catalogData from "@/lib/exercise-catalog.json";
import { CATALOG_DEFAULTS } from "@/lib/exercise-legacy-map";
import {
  CUSTOM_RANK,
  DEFAULT_BODYWEIGHT_LOAD,
  type Equipment,
  type Exercise,
  type Muscle,
  type Region,
} from "@/lib/training";

/**
 * Die Übungsbibliothek. Sie steht bewusst nicht in der Datenbank: sie ist für
 * alle Nutzer gleich, ändert sich nur mit einer neuen Version der App und wäre
 * als 1295 Zeilen pro Nutzer bei jedem Abgleich unnötiger Ballast. Erzeugt von
 * scripts/build-exercise-catalog.mjs aus dem openGym-Datensatz.
 *
 * In der Tabelle `exercises` steht darum nur noch, was jemand selbst angelegt
 * oder an einer Katalogübung verstellt hat. `mergeExercises` legt beides
 * übereinander — davor sieht der Rest der App wie bisher eine flache Liste.
 */
export type CatalogExercise = {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  secondary: Muscle[];
  media: string;
  en: string;
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
};

/** Eine Katalogübung so, wie sie ohne jede Anpassung aussieht. */
export function fromCatalog(entry: CatalogExercise): Exercise {
  const defaults = CATALOG_DEFAULTS[entry.id];
  return {
    id: entry.id,
    name: entry.name,
    muscle: entry.muscle,
    equipment: entry.equipment,
    isCustom: false,
    hidden: false,
    favorite: false,
    increment: null,
    // Von Hand gesetzt schlägt geschätzt — auch eine ausdrückliche Null, die
    // heißt „für diese Übung gibt es keinen Startwert" und keine Lücke.
    bodyweightFactor: defaults && "factor" in defaults ? defaults.factor : entry.startFactor,
    loadFactor:
      defaults?.load ??
      (entry.equipment === "bodyweight" ? DEFAULT_BODYWEIGHT_LOAD : null),
    warmup: null,
    media: entry.media,
    secondary: entry.secondary,
    en: entry.en,
    region: entry.region,
    rank: entry.rank,
    rating: null,
  };
}

/**
 * Was eine Zeile mitbekommt, zu der es keinen Katalogeintrag gibt: eigene
 * Übungen und Reste aus der alten Bibliothek. Kein Bild, keine Nebenmuskeln,
 * kein englischer Name, keine Region — und die volle Beliebtheitsstufe, damit
 * eine selbst angelegte Übung nie im ausgeblendeten Teil landet.
 */
function ohneKatalog(): Pick<Exercise, "media" | "secondary" | "en" | "region" | "rank"> {
  // Jedes Mal ein frisches Objekt: ein geteiltes `secondary`-Array wäre eines,
  // das sich eine Übung mit allen anderen teilt.
  return { media: null, secondary: [], en: null, region: null, rank: CUSTOM_RANK };
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
  };
}

const MEDIA_BASE = "/uebungen";

/** Das animierte GIF einer Übung, oder null bei einer eigenen Übung. */
export function gifUrl(exercise: { id: string; media: string | null }): string | null {
  if (!exercise.media) return null;
  return `${MEDIA_BASE}/gif/${exercise.id.slice(3)}-${exercise.media}.gif`;
}

/** Das Standbild — leichter als das GIF, für Listen und Vorschauen. */
export function imageUrl(exercise: { id: string; media: string | null }): string | null {
  if (!exercise.media) return null;
  return `${MEDIA_BASE}/img/${exercise.id.slice(3)}-${exercise.media}.jpg`;
}

/**
 * Die Anleitungen liegen getrennt vom Katalog, weil sie mit 600 KB deutlich
 * schwerer sind als die Liste selbst und nur gebraucht werden, wenn jemand eine
 * einzelne Übung aufschlägt.
 *
 * Der Datensatz liefert sie auf Englisch; die deutsche Fassung entsteht aus
 * scripts/anleitungen-bauen.mjs. Gelesen wird zuerst Deutsch — nur was dort
 * fehlt, kommt aus dem Original. So kann die Übersetzung wachsen, ohne dass
 * zwischendurch Übungen ohne Anleitung dastehen.
 */
type Anleitungen = Record<string, string[]>;

let deutschCache: Anleitungen | null = null;
let englischCache: Anleitungen | null = null;

/** Alle Anleitungen in je einer Datei — ein Abruf reicht für die Bibliothek. */
export const INSTRUCTIONS_URL = `${MEDIA_BASE}/anleitungen.json`;
export const INSTRUCTIONS_DE_URL = `${MEDIA_BASE}/anleitungen-de.json`;

async function holeAnleitungen(url: string): Promise<Anleitungen> {
  try {
    const response = await fetch(url);
    if (!response.ok) return {};
    return (await response.json()) as Anleitungen;
  } catch {
    // Ohne Netz und ohne Zwischenspeicher gibt es keine Anleitung — die Übung
    // bleibt trotzdem benutzbar, also still bleiben statt werfen.
    return {};
  }
}

export async function loadInstructions(id: string): Promise<string[]> {
  if (!deutschCache) deutschCache = await holeAnleitungen(INSTRUCTIONS_DE_URL);
  const deutsch = deutschCache[id];
  if (deutsch && deutsch.length > 0) return deutsch;

  if (!englischCache) englischCache = await holeAnleitungen(INSTRUCTIONS_URL);
  return englischCache[id] ?? [];
}
