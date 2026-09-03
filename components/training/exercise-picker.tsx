"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Check, Sparkles, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useShowRare } from "@/lib/use-show-rare";
import { cn } from "@/lib/utils";
import { useTraining } from "@/lib/training-store";
import { createExercise, updateExercise } from "@/lib/api-training";
import { ExerciseThumb } from "@/components/training/exercise-media";
import { FilterSelect } from "@/components/training/filter-sheet";
import { RankBars } from "@/components/training/rank-bars";
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  LADEARTEN,
  LADEART_HINWEISE,
  LADEART_LABELS,
  LADEART_OFFEN,
  LADEART_OFFEN_LABEL,
  MUSCLES,
  MUSCLE_LABELS,
  RANK_SICHTBAR_AB,
  REGIONS,
  REGION_SHORT,
  kurzerName,
  ladeartVon,
  stufeVon,
  type Equipment,
  type Exercise,
  type Ladeart,
  type Muscle,
  type Region,
} from "@/lib/training";
import { guete, suchwoerter, verlaufVon } from "@/lib/exercise-suche";
import { WARMUP_OPTIONS, warmupHinweis } from "@/lib/warmup";
import { Chip } from "@/components/ui/chip";

const EQUIPMENT_KEYS = EQUIPMENT;

/**
 * So viele Treffer zeigt die Auswahl höchstens. Die Bibliothek hat rund 1300
 * Übungen — wer ohne Filter öffnet, will ohnehin erst suchen, und ein Dialog
 * mit tausend Zeilen ruckelt auf dem Handy.
 *
 * Der Deckel greift erst nach der Rangfolge. Vorher schnitt er alphabetisch ab:
 * wer „press“ tippte, bekam „Assisted …“ und sah nie, dass zwanzig Zeilen
 * weiter unten das Bankdrücken stand.
 */
const MAX_TREFFER = 60;

/**
 * So viele eigene Übungen stehen über der Bibliothek.
 *
 * Der Block soll den Blick sparen, nicht den Bildschirm füllen — wer mehr als
 * zwölf Zeilen durchsieht, sucht ohnehin etwas anderes und tippt.
 */
const MAX_EIGENE = 12;

/** Der Ladeart-Filter kennt einen Wert mehr als die Ladeart: das Offene. */
type LadeartFilter = Ladeart | typeof LADEART_OFFEN;

function passtZurLadeart(exercise: Exercise, gewaehlt: LadeartFilter | null): boolean {
  if (gewaehlt === null) return true;
  const ist = ladeartVon(exercise);
  return gewaehlt === LADEART_OFFEN ? ist === null : ist === gewaehlt;
}

export function ExercisePicker({
  open,
  onOpenChange,
  onPick,
  excludeIds = [],
  initialCreate = false,
  title = "Übung hinzufügen",
  description = "Aus der Bibliothek wählen oder eine eigene Übung anlegen.",
  alternativeTo = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exercise: Exercise) => void;
  excludeIds?: string[];
  /** Öffnet direkt das Formular für eine eigene Übung statt der Bibliothek. */
  initialCreate?: boolean;
  /**
   * Überschrift und Erklärung. Derselbe Wähler dient zwei Zwecken — dazunehmen
   * und tauschen —, und wer tauschen wollte, soll nicht „hinzufügen" lesen.
   */
  title?: string;
  description?: string;
  /**
   * Die Übung, für die Ersatz gesucht wird.
   *
   * Damit ist die Frage eine andere: nicht „welche Übung will ich machen“,
   * sondern „was deckt dasselbe ab“ — weil das Gerät besetzt ist oder weil
   * einem die Bewegung heute nicht liegt. Der Wähler öffnet dann vorgefiltert
   * auf denselben Muskel und Bereich und stellt die Treffer nach vorn, die
   * auch dieselben Nebenmuskeln bedienen.
   */
  alternativeTo?: Exercise | null;
}) {
  const { exercises, sessions, upsertExercise } = useTraining();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [ladeart, setLadeart] = useState<LadeartFilter | null>(null);
  const [showRare, toggleShowRare] = useShowRare();
  const [creating, setCreating] = useState(initialCreate);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState<Muscle>("chest");
  const [newEquipment, setNewEquipment] = useState<Equipment>("barbell");
  const [newWarmup, setNewWarmup] = useState<"always" | "never" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState<string | null>(null);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  /**
   * Beim Tausch mit der Frage anfangen, die gestellt wurde: derselbe Muskel,
   * derselbe Bereich. Das Gerät bleibt bewusst offen — wer tauscht, weil eine
   * Maschine besetzt ist, sucht ja gerade ein anderes.
   */
  useEffect(() => {
    if (!open || !alternativeTo) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setzt die Filter einmalig beim Öffnen
    setMuscle(alternativeTo.muscle);
    setRegion(alternativeTo.region);
    setEquipment(null);
    setLadeart(null);
    setQuery("");
  }, [open, alternativeTo]);

  /**
   * Wie stark eine Übung dieselbe Arbeit macht wie die getauschte: der
   * Hauptmuskel zählt doppelt, jeder gemeinsame Nebenmuskel einfach, derselbe
   * Bereich noch einmal doppelt.
   *
   * Der Hauptmuskel ist nach dem Vorfiltern zwar bei allen gleich — aber wer
   * den Filter aufmacht, um breiter zu suchen, soll die passenden Treffer
   * trotzdem oben behalten.
   */
  const naeheZu = useMemo(() => {
    if (!alternativeTo) return null;
    const nebenAlt = new Set(alternativeTo.secondary);
    return (e: Exercise) => {
      let punkte = 0;
      if (e.muscle === alternativeTo.muscle) punkte += 2;
      if (e.region !== null && e.region === alternativeTo.region) punkte += 2;
      for (const m of e.secondary) if (nebenAlt.has(m)) punkte += 1;
      // Der Hauptmuskel der einen kann der Nebenmuskel der anderen sein.
      if (nebenAlt.has(e.muscle)) punkte += 1;
      if (alternativeTo.secondary.includes(e.muscle)) punkte += 1;
      return punkte;
    };
  }, [alternativeTo]);

  async function toggleFavorite(exercise: Exercise) {
    setFavoriteBusy(exercise.id);
    try {
      upsertExercise(await updateExercise({ id: exercise.id, favorite: !exercise.favorite }));
    } finally {
      setFavoriteBusy(null);
    }
  }

  /** Wann und wie oft jede Übung vorkam — die Rangfolge hängt daran. */
  const verlauf = useMemo(() => verlaufVon(sessions), [sessions]);

  /**
   * Die Muskeln, um die es heute geht.
   *
   * Ohne neue Prop: `excludeIds` sind die Übungen, die schon im Tag stehen.
   * Wird der Wähler ohne sie geöffnet — aus der Bibliothek heraus —, bleibt die
   * Menge leer und der Kontextteil fällt einfach weg.
   */
  const nachId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const heutigeMuskeln = useMemo(() => {
    const muskeln = new Set<Muscle>();
    for (const id of excluded) {
      const e = nachId.get(id);
      if (e) muskeln.add(e.muscle);
    }
    return muskeln;
  }, [excluded, nachId]);

  const gesucht = useMemo(() => suchwoerter(query), [query]);
  const sucht = gesucht.length > 0;

  const visible = useMemo(
    () =>
      exercises
        .filter((e) => !e.hidden)
        .filter((e) => showRare || e.favorite || stufeVon(e) >= RANK_SICHTBAR_AB)
        .filter((e) => (muscle === null ? true : e.muscle === muscle))
        .filter((e) => (region === null ? true : e.region === region))
        .filter((e) => (equipment === null ? true : e.equipment === equipment))
        .filter((e) => passtZurLadeart(e, ladeart))
        // Die Suche steckt in lib/exercise-suche.ts: deutsche Begriffe,
        // Wortsuche statt Teilstring, und eine Trefferklasse statt Ja/Nein.
        .map((e) => ({ e, g: guete(e, gesucht, query) }))
        .filter((t) => t.g > 0),
    [exercises, muscle, region, equipment, ladeart, gesucht, query, showRare]
  );

  /**
   * Die Rangfolge, in der die Treffer stehen.
   *
   * Von der Frage her gelesen, die jemand gerade stellt: beim Tausch zählt
   * zuerst, wie nah die Übung an der getauschten liegt; dann, wie gut sie zur
   * Eingabe passt; dann, ob sie überhaupt schon einmal trainiert wurde. Erst
   * ganz unten steht das Alphabet.
   */
  const rang = useMemo(() => {
    const wann = (id: string) => verlauf[id]?.zuletzt ?? "";
    return (a: { e: Exercise; g: number }, b: { e: Exercise; g: number }) =>
      (naeheZu ? naeheZu(b.e) - naeheZu(a.e) : 0) ||
      b.g - a.g ||
      Number(verlauf[b.e.id] !== undefined) - Number(verlauf[a.e.id] !== undefined) ||
      Number(b.e.favorite) - Number(a.e.favorite) ||
      wann(b.e.id).localeCompare(wann(a.e.id)) ||
      stufeVon(b.e) - stufeVon(a.e) ||
      a.e.name.localeCompare(b.e.name, "de");
  }, [naeheZu, verlauf]);

  /**
   * Die eigenen Übungen, solange nichts getippt ist.
   *
   * Der häufigste Fall im Gym ist nicht „welche Übung gibt es“, sondern „die,
   * die ich sowieso mache“ — und die stand bisher irgendwo in tausend Zeilen.
   * Die Muskeln des heutigen Tages zuerst, darin die zuletzt trainierten.
   */
  const eigene = useMemo(() => {
    if (sucht) return [];
    return visible
      .filter((t) => verlauf[t.e.id] !== undefined)
      .sort(
        (a, b) =>
          Number(heutigeMuskeln.has(b.e.muscle)) - Number(heutigeMuskeln.has(a.e.muscle)) ||
          verlauf[b.e.id].zuletzt.localeCompare(verlauf[a.e.id].zuletzt) ||
          verlauf[b.e.id].anzahl - verlauf[a.e.id].anzahl ||
          a.e.name.localeCompare(b.e.name, "de")
      )
      .slice(0, MAX_EIGENE)
      .map((t) => t.e);
  }, [visible, verlauf, heutigeMuskeln, sucht]);

  const regionOptions = useMemo(
    () =>
      REGIONS.filter((r) => muscle === null || r.muscle === muscle).map((r) => ({
        value: r.key,
        label: r.label,
        hint: muscle === null ? MUSCLE_LABELS[r.muscle] : undefined,
      })),
    [muscle]
  );

  /** Erst in die Rangfolge, dann unter den Deckel. */
  const sortiert = useMemo(() => [...visible].sort(rang), [visible, rang]);
  const besten = useMemo(() => sortiert.slice(0, MAX_TREFFER), [sortiert]);

  /**
   * Die Bibliothek, nach Muskeln geordnet — die Ordnung, in der man eine
   * Bibliothek durchsieht.
   *
   * Ohne die, die schon oben stehen: der Block der eigenen Übungen ist die
   * Abkürzung, die Gruppen darunter sind der Rest. Beides zu zeigen hieße,
   * dieselben zwölf Zeilen zweimal untereinander zu setzen.
   *
   * Gebaut wird das nur, solange nichts getippt ist. Wer sucht, will die
   * besten Treffer beieinander sehen und nicht auf zehn Überschriften
   * verteilt; dort steht die Muskelgruppe stattdessen in der Zeile.
   */
  const grouped = useMemo(() => {
    if (sucht) return [];
    const schonOben = new Set(eigene.map((e) => e.id));
    const map = new Map<Muscle, Exercise[]>();
    let gezeigt = 0;
    for (const { e } of sortiert) {
      if (schonOben.has(e.id)) continue;
      if (gezeigt >= MAX_TREFFER) break;
      gezeigt++;
      const list = map.get(e.muscle) ?? [];
      list.push(e);
      map.set(e.muscle, list);
    }
    return MUSCLES.map((m) => ({ muscle: m.key, label: m.label, items: map.get(m.key) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [sortiert, eigene, sucht]);

  /** Was der Deckel abgeschnitten hat — die oben gezeigten zählen nicht mit. */
  const zuViele = Math.max(0, visible.length - eigene.length - MAX_TREFFER);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const exercise = await createExercise({
        name,
        muscle: newMuscle,
        equipment: newEquipment,
        warmup: newWarmup,
      });
      upsertExercise(exercise);
      onPick(exercise);
      setNewName("");
      setNewWarmup(null);
      setCreating(false);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konnte Übung nicht anlegen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCreating(initialCreate);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col rounded-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {alternativeTo
              ? `Vorgefiltert auf ${MUSCLE_LABELS[alternativeTo.muscle]}${
                  alternativeTo.region ? ` · ${REGION_SHORT[alternativeTo.region]}` : ""
                } — oben steht, was „${kurzerName(alternativeTo.name)}“ am nächsten kommt.`
              : description}
          </DialogDescription>
        </DialogHeader>

        {creating ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-exercise-name" className="text-xs text-muted-foreground">
                Name
              </Label>
              <Input
                id="new-exercise-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z. B. Landmine Press"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Muskelgruppe</Label>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLES.map((m) => (
                  <Chip
                    key={m.key}
                    active={newMuscle === m.key}
                    onClick={() => setNewMuscle(m.key)}
                  >
                    {m.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Gerät</Label>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT_KEYS.map((key) => (
                  <Chip
                    key={key}
                    active={newEquipment === key}
                    onClick={() => setNewEquipment(key)}
                  >
                    {EQUIPMENT_LABELS[key]}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Aufwärmsatz</Label>
              <div className="flex flex-wrap gap-1.5">
                {WARMUP_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value ?? "auto"}
                    active={newWarmup === opt.value}
                    onClick={() => setNewWarmup(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {warmupHinweis(newEquipment !== "bodyweight", newWarmup)}
              </p>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => (initialCreate ? onOpenChange(false) : setCreating(false))}
              >
                {initialCreate ? "Abbrechen" : "Zurück"}
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? "Speichert…" : "Anlegen"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Übung suchen"
                className="pl-10"
              />
            </div>

            {/* Der Bereich steht direkt am Muskel, zu dem er gehört — dazwischen
                gehört nichts. Danach die zwei Fragen zum Gerät: welches, und ob
                man dafür Scheiben auflegen muss. */}
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <FilterSelect
                label="Muskelgruppe"
                allLabel="Alle Muskeln"
                value={muscle}
                options={MUSCLES.map((m) => ({ value: m.key, label: m.label }))}
                onChange={(next) => {
                  setMuscle(next);
                  setRegion(null);
                }}
              />
              {regionOptions.length > 0 && (
                <FilterSelect
                  label="Bereich"
                  allLabel="Alle Bereiche"
                  value={region}
                  options={regionOptions}
                  onChange={setRegion}
                />
              )}
              <FilterSelect
                label="Gerät"
                allLabel="Alle Geräte"
                value={equipment}
                options={EQUIPMENT_KEYS.map((key) => ({
                  value: key,
                  label: EQUIPMENT_LABELS[key],
                }))}
                onChange={setEquipment}
              />
              <FilterSelect
                label="Ladeart"
                allLabel="Jede Ladeart"
                value={ladeart}
                options={[
                  ...LADEARTEN.map((key) => ({
                    value: key as LadeartFilter,
                    label: LADEART_LABELS[key],
                    hint: LADEART_HINWEISE[key],
                  })),
                  // Zum Durchgehen: die Maschinen, bei denen es noch niemand
                  // entschieden hat.
                  {
                    value: LADEART_OFFEN as LadeartFilter,
                    label: LADEART_OFFEN_LABEL,
                    hint: "selbst festlegen",
                  },
                ]}
                onChange={setLadeart}
              />
            </div>

            <div className="-mx-1 flex-1 overflow-y-auto px-1">
              {besten.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <p className="text-center text-sm text-muted-foreground">
                    Keine Übung gefunden.
                  </p>
                  {/* Der wahrscheinlichste Grund für eine leere Liste ist die
                      Stufe — bei „Ball“ etwa ist standardmäßig alles unten. */}
                  {!showRare && (
                    <Button variant="ghost" size="sm" onClick={toggleShowRare}>
                      <Sparkles className="size-4" />
                      Auch ungewöhnliche zeigen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {(() => {
                    const zeile = (exercise: Exercise, mitMuskel: boolean) => (
                      <Treffer
                        key={exercise.id}
                        exercise={exercise}
                        mitMuskel={mitMuskel}
                        schonDrin={excluded.has(exercise.id)}
                        favoritBeschaeftigt={favoriteBusy === exercise.id}
                        onPick={() => {
                          onPick(exercise);
                          onOpenChange(false);
                        }}
                        onFavorit={() => toggleFavorite(exercise)}
                      />
                    );

                    // Wer sucht, will die besten Treffer beieinander sehen —
                    // Muskel-Überschriften würden die Rangfolge wieder
                    // auseinanderreißen.
                    if (sucht) {
                      return (
                        <div className="flex flex-col gap-1">
                          {besten.map(({ e }) => zeile(e, true))}
                        </div>
                      );
                    }

                    return (
                      <>
                        {eigene.length > 0 && (
                          <div className="flex flex-col gap-1">
                            <p className="px-1 text-xs text-muted-foreground">Deine Übungen</p>
                            {eigene.map((e) => zeile(e, true))}
                          </div>
                        )}
                        {eigene.length > 0 && grouped.length > 0 && (
                          <p className="px-1 text-xs text-muted-foreground">Alle Übungen</p>
                        )}
                        {grouped.map((group) => (
                          <div key={group.muscle} className="flex flex-col gap-1">
                            <p className="px-1 text-xs text-muted-foreground">{group.label}</p>
                            {group.items.map((e) => zeile(e, false))}
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  {zuViele > 0 && (
                    <p className="px-1 py-1 text-xs text-muted-foreground">
                      {zuViele} weitere Übungen — such nach dem Namen oder grenze mit
                      Muskel, Bereich, Gerät und Ladeart ein.
                    </p>
                  )}

                  {!showRare && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-fit"
                      onClick={toggleShowRare}
                    >
                      <Sparkles className="size-4" />
                      Auch ungewöhnliche zeigen
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus />
              Eigene Übung anlegen
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Eine Zeile der Trefferliste.
 *
 * Steht hier und nicht dreimal im Dialog: dieselbe Zeile trägt den Block der
 * eigenen Übungen, die flache Trefferliste und die nach Muskeln geordnete
 * Bibliothek.
 */
/**
 * Die Ladeart in der Zeile — nur bei Maschinen und nur, wenn sie feststeht.
 * Bei Langhantel und Kabelzug sagt sie nichts, was das Gerät nicht schon sagt.
 */
function ladeartMaschine(exercise: Exercise): string | null {
  if (exercise.equipment !== "machine") return null;
  const art = ladeartVon(exercise);
  return art === null ? null : LADEART_LABELS[art];
}

function Treffer({
  exercise,
  mitMuskel,
  schonDrin,
  favoritBeschaeftigt,
  onPick,
  onFavorit,
}: {
  exercise: Exercise;
  /**
   * Ob die Muskelgruppe in der Zeile steht. In der nach Muskeln geordneten
   * Bibliothek steht sie schon als Überschrift darüber; in der flachen
   * Trefferliste fehlt sie sonst ganz.
   */
  mitMuskel: boolean;
  /** Die Übung steht heute schon im Tag. */
  schonDrin: boolean;
  favoritBeschaeftigt: boolean;
  onPick: () => void;
  onFavorit: () => void;
}) {
  const zusatz = [
    mitMuskel ? MUSCLE_LABELS[exercise.muscle] : null,
    exercise.region ? REGION_SHORT[exercise.region] : null,
    EQUIPMENT_LABELS[exercise.equipment],
    // Nur bei Maschinen: bei Langhantel und Kabelzug sagt die Ladeart nichts,
    // was das Gerät nicht schon sagt, und die Zeile ist auf dem Handy knapp.
    // Nur wo sie bekannt ist. Bei einer Maschine ohne Angabe stünde sonst
    // eine Vermutung, die genauso aussieht wie eine Auskunft.
    ladeartMaschine(exercise),
    exercise.isCustom ? "eigene" : null,
  ].filter((teil): teil is string => teil !== null);

  return (
    <div className="flex items-center gap-1 rounded-field transition-colors hover:bg-card">
      <button
        type="button"
        onClick={onPick}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
      >
        <ExerciseThumb exercise={exercise} className="size-16" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{exercise.name}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <RankBars exercise={exercise} />
            <span className="truncate">{zusatz.join(" · ")}</span>
          </span>
        </span>
        {schonDrin && <Check className="size-4 shrink-0 text-muted-foreground" />}
      </button>
      <button
        type="button"
        disabled={favoritBeschaeftigt}
        onClick={onFavorit}
        aria-label={
          exercise.favorite
            ? `${exercise.name} aus Favoriten entfernen`
            : `${exercise.name} als Favorit markieren`
        }
        className="shrink-0 p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <Star className={cn("size-4", exercise.favorite && "fill-current text-primary")} />
      </button>
    </div>
  );
}
