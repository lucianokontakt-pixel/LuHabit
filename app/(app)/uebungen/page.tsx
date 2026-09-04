"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Ellipsis,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Weight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExercisePicker } from "@/components/training/exercise-picker";
import { ExerciseEditor } from "@/components/training/exercise-editor";
import { ExerciseThumb } from "@/components/training/exercise-media";
import { FilterSelect } from "@/components/training/filter-sheet";
import { BewaehrtAbzeichen, RankBars } from "@/components/training/rank-bars";
import { useTraining } from "@/lib/training-store";
import { deleteExercise, updateExercise } from "@/lib/api-training";
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
  REGION_SHORT,
  REGIONS,
  defaultIncrement,
  ladeartVon,
  stufeVon,
  type Equipment,
  type Exercise,
  type Ladeart,
  type Muscle,
  type Region,
} from "@/lib/training";
import { guete, suchwoerter, verlaufVon } from "@/lib/exercise-suche";
import { useShowRare } from "@/lib/use-show-rare";
import { cn } from "@/lib/utils";
import { MUSCLE_TINT, TINT_FILL } from "@/lib/tints";
import { PageTitle } from "@/components/ui/page-title";
import { Skeleton } from "@/components/ui/skeleton";

const EQUIPMENT_KEYS = EQUIPMENT;

/** Der Ladeart-Filter kennt einen Wert mehr als die Ladeart: das Offene. */
type LadeartFilter = Ladeart | typeof LADEART_OFFEN;

function passtZurLadeart(exercise: Exercise, gewaehlt: LadeartFilter | null): boolean {
  if (gewaehlt === null) return true;
  const ist = ladeartVon(exercise);
  return gewaehlt === LADEART_OFFEN ? ist === null : ist === gewaehlt;
}

/**
 * Wie viele Übungen eine Muskelgruppe zeigt, bevor sie aufgeklappt werden will.
 * Die Bibliothek hat rund 1300 Einträge — ungebremst stünden hier gut tausend
 * Zeilen samt Vorschaubild im Dokument, nur damit jemand nach unten wischt.
 */
const VORSCHAU = 24;

/**
 * Wonach die Liste innerhalb einer Muskelgruppe sortiert.
 *
 * Gruppiert bleibt sie immer nach Muskel — das ist die Ordnung, in der man
 * eine Übungsbibliothek durchsieht, und eine flache Liste von 1295 Einträgen
 * wäre nach keiner Sortierung übersichtlich.
 */
type Sortierung = "beliebtheit" | "name" | "zuletzt";

const SORT_OPTIONS: { value: Sortierung; label: string; hint: string }[] = [
  { value: "beliebtheit", label: "Beliebtheit", hint: "Favoriten zuerst" },
  { value: "name", label: "Name", hint: "A–Z" },
  { value: "zuletzt", label: "Zuletzt trainiert", hint: "Neueste zuerst" },
];

/**
 * Die Zeile unter dem Übungsnamen — oder nichts.
 *
 * Solange die Übung deutsch hieß, stand das Gerät fast immer schon im Namen
 * selbst ("Bankdrücken (breit, Langhantel)"); die Zeile darunter blieb dann
 * leer. Die Namen stehen inzwischen im englischen Original ("Barbell Bench
 * Press"), das Gerät ("Langhantel") aber weiterhin deutsch — der Vergleich
 * greift damit nicht mehr, und die Zeile erscheint praktisch immer. Das ist
 * kein Fehler, nur keine Ersparnis mehr; den Vergleich lohnt es sich trotzdem
 * zu behalten, falls Namen wieder einmal deutsch werden.
 *
 * Alles andere ist ohnehin eine Ausnahme und darf bleiben: ein abweichender
 * Sprung, der Lastanteil bei Eigengewicht, „eigene", „ausgeblendet".
 */
/**
 * Die Ladeart in der Zeile — nur bei Maschinen und nur, wenn sie feststeht.
 * Eine Vermutung sähe hier aus wie eine Auskunft.
 */
function ladeartMaschine(exercise: Exercise): string | null {
  if (exercise.equipment !== "machine") return null;
  const art = ladeartVon(exercise);
  return art === null ? null : LADEART_LABELS[art];
}

function zusatzZeile(exercise: Exercise): string | null {
  const geraet = EQUIPMENT_LABELS[exercise.equipment];
  const teile = [
    exercise.name.toLowerCase().includes(geraet.toLowerCase()) ? null : geraet,
    // Nur bei Maschinen: bei Langhantel und Kabelzug sagt die Ladeart nichts,
    // was das Gerät nicht schon sagt.
    ladeartMaschine(exercise),
    // Der Bereich steht vor dem Sprung: er sagt etwas über die Bewegung, alles
    // Weitere nur über die Einstellungen.
    exercise.region ? REGION_SHORT[exercise.region] : null,
    exercise.increment !== null ? `${exercise.increment} kg Sprung` : null,
    // Der Lastanteil erklärt, warum eine Übung ohne Hantel überhaupt Volumen
    // erzeugt.
    exercise.loadFactor !== null && exercise.loadFactor > 0
      ? `${Math.round(exercise.loadFactor * 100)} % Last`
      : null,
    exercise.isCustom ? "eigene" : null,
    exercise.hidden ? "ausgeblendet" : null,
  ].filter((teil): teil is string => teil !== null);

  return teile.length > 0 ? teile.join(" · ") : null;
}

export default function ExercisesPage() {
  const { exercises, sessions, upsertExercise, reload, loading } = useTraining();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [ladeart, setLadeart] = useState<LadeartFilter | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showRare, toggleShowRare] = useShowRare();
  const [sort, setSort] = useState<Sortierung>("beliebtheit");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [expanded, setExpanded] = useState<Set<Muscle>>(new Set());
  // Welche Muskelgruppen von Hand aufgeklappt wurden. Ungefiltert bleiben
  // alle zehn zu — sonst ständen auf einen Blick zehnmal bis zu 24 Übungen
  // samt Bild da, nur um „Brust" zu erreichen.
  const [openGroups, setOpenGroups] = useState<Set<Muscle>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const gesucht = useMemo(() => suchwoerter(query), [query]);

  /**
   * Wie gut jede Übung zur Eingabe passt. Dieselbe Suche wie im Übungswähler
   * (lib/exercise-suche.ts): deutsche Begriffe für eine englische Bibliothek,
   * Wortsuche statt Teilstring.
   */
  const treffer = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of exercises) map[e.id] = guete(e, gesucht, query);
    return map;
  }, [exercises, gesucht, query]);

  const filtered = useMemo(
    () =>
      exercises
        .filter((e) => (showHidden ? true : !e.hidden))
        .filter((e) => (favoritesOnly ? e.favorite : true))
        // Die ungewöhnlichen bleiben draußen, bis jemand danach fragt — außer er
        // hat die Übung als Favorit markiert, dann ist die Frage beantwortet.
        .filter((e) => showRare || e.favorite || stufeVon(e) >= RANK_SICHTBAR_AB)
        .filter((e) => (muscle === null ? true : e.muscle === muscle))
        .filter((e) => (region === null ? true : e.region === region))
        .filter((e) => (equipment === null ? true : e.equipment === equipment))
        .filter((e) => passtZurLadeart(e, ladeart))
        .filter((e) => treffer[e.id] > 0),
    [exercises, treffer, muscle, equipment, region, ladeart, showHidden, favoritesOnly, showRare]
  );

  /**
   * Wie viele Übungen noch keine Ladeart haben. Steht als Hinweis am Filter —
   * sonst wäre „Noch offen“ ein Eintrag, hinter dem man nicht weiß, ob sich
   * das Antippen lohnt.
   */
  const offeneAnzahl = useMemo(
    () => exercises.filter((e) => e.equipment === "machine" && ladeartVon(e) === null).length,
    [exercises]
  );

  /** Wann und wie oft jede Übung vorkam — siehe lib/exercise-suche.ts. */
  const verlauf = useMemo(() => verlaufVon(sessions), [sessions]);

  /**
   * Die Regionen, die zur Auswahl stehen. Ist eine Muskelgruppe gewählt, nur
   * ihre — sonst stünde unter „Brust“ auch „Lat“ und liefe ins Leere.
   */
  const regionOptions = useMemo(
    () =>
      REGIONS.filter((r) => muscle === null || r.muscle === muscle).map((r) => ({
        value: r.key,
        label: r.label,
        hint: muscle === null ? MUSCLE_LABELS[r.muscle] : undefined,
      })),
    [muscle]
  );

  const grouped = useMemo(() => {
    const map = new Map<Muscle, typeof filtered>();
    for (const e of filtered) {
      const list = map.get(e.muscle) ?? [];
      list.push(e);
      map.set(e.muscle, list);
    }
    // Jede Sortierung tut genau das, was auf ihrem Knopf steht. Favoriten
    // stehen nur bei „Beliebtheit“ vorn: dort gehören sie hin, weil die Frage
    // „was ist für mich das Naheliegendste“ lautet. Bei „Name“ wären sie eine
    // Lüge — eine Liste A–Z, die nicht bei A anfängt.
    const nachName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, "de");
    const vergleich: Record<Sortierung, (a: Exercise, b: Exercise) => number> = {
      // Bei „Beliebtheit" zählt zuerst, wie gut der Treffer zur Eingabe passt —
      // die Frage lautet ja „was ist für mich das Naheliegendste". Bei „Name"
      // wäre das eine Lüge: eine Liste A–Z, die nicht bei A anfängt.
      beliebtheit: (a, b) =>
        treffer[b.id] - treffer[a.id] ||
        Number(b.favorite) - Number(a.favorite) ||
        stufeVon(b) - stufeVon(a) ||
        nachName(a, b),
      name: nachName,
      // Nie trainiert heißt ganz nach hinten, nicht ganz nach vorn: ein leeres
      // Datum ist keine Null, sondern eine fehlende Angabe.
      zuletzt: (a, b) => {
        const da = verlauf[a.id]?.zuletzt;
        const db = verlauf[b.id]?.zuletzt;
        if (da && db) return db.localeCompare(da) || nachName(a, b);
        if (da) return -1;
        if (db) return 1;
        return stufeVon(b) - stufeVon(a) || nachName(a, b);
      },
    };
    for (const list of map.values()) list.sort(vergleich[sort]);
    return MUSCLES.map((m) => ({ key: m.key, label: m.label, items: map.get(m.key) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [filtered, sort, verlauf, treffer]);

  // Sobald etwas die Liste schon eingrenzt, ist Aufklappen keine Hilfe mehr,
  // sondern nur ein weiterer Tipp vor dem Ergebnis, nach dem gesucht wurde.
  const gefiltert =
    query.trim() !== "" ||
    muscle !== null ||
    equipment !== null ||
    region !== null ||
    ladeart !== null ||
    favoritesOnly;

  async function toggleHidden(id: string, hidden: boolean) {
    setBusy(id);
    try {
      upsertExercise(await updateExercise({ id, hidden }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Übung nicht ändern");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Die Ladeart aus der Liste heraus setzen — ohne den Umweg über den Editor.
   *
   * Der Filter „Noch offen“ und diese zwei Einträge sind zusammen gedacht:
   * einmal filtern, dann je Übung ein Tipp. Über den Editor wären es vier je
   * Übung, und bei siebzig Maschinen ist das der Unterschied zwischen einer
   * Sache, die man macht, und einer, die man sich vornimmt.
   */
  async function setzeLadeart(exercise: Exercise, art: Ladeart) {
    setBusy(exercise.id);
    try {
      // Nochmal dasselbe wählen lässt sie wieder offen.
      const naechste = exercise.ladeart === art ? null : art;
      upsertExercise(await updateExercise({ id: exercise.id, ladeart: naechste }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Übung nicht ändern");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFavorite(id: string, favorite: boolean) {
    setBusy(id);
    try {
      upsertExercise(await updateExercise({ id, favorite }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Übung nicht ändern");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string, name: string) {
    setBusy(id);
    try {
      await deleteExercise(id);
      await reload();
      toast.success(`„${name}“ entfernt`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Übung nicht entfernen");
    } finally {
      setBusy(null);
    }
  }

  const hiddenCount = exercises.filter((e) => e.hidden).length;

  return (
    <div className="flex flex-col gap-5">
      <PageTitle eyebrow={`${exercises.length} Übungen nach Muskelgruppe und Gerät`}>
        Übungen
      </PageTitle>


      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Übung suchen"
              className="pl-10"
            />
          </div>
          <Button size="lg" className="h-11 shrink-0 px-4" onClick={() => setCreating(true)}>
            <Plus />
            Eigene Übung
          </Button>
        </div>

        {/* Antippen statt schieben. Der Wert steht im Knopf — vorher musste
            man die Reihe erst zurückscrollen, um zu sehen, was eingestellt
            war. */}
        <div className="flex flex-wrap gap-1.5">
          <FilterSelect
            label="Muskelgruppe"
            allLabel="Alle Muskeln"
            value={muscle}
            options={MUSCLES.map((m) => ({ value: m.key, label: m.label }))}
            onChange={(next) => {
              setMuscle(next);
              // Eine Region gehört immer zu genau einer Muskelgruppe; wechselt
              // die Gruppe, passt die alte Region nicht mehr.
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
          {/* Was das Gerät nicht sagt: ob man Scheiben auflegen muss oder nur
              den Stift umsteckt. */}
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
              // Der Einstieg zum Durchgehen: alle Maschinen, bei denen es noch
              // niemand entschieden hat.
              {
                value: LADEART_OFFEN as LadeartFilter,
                label: LADEART_OFFEN_LABEL,
                hint: `${offeneAnzahl}`,
              },
            ]}
            onChange={setLadeart}
          />
          {/* Die Sortierung hat kein „Alle“ — es ist immer eine gewählt.
              Darum trägt der Knopf sie auch immer im Text, und ein Tipp auf
              die schon gewählte Zeile lässt sie stehen. */}
          <FilterSelect
            label="Sortierung"
            allLabel={SORT_OPTIONS[0].label}
            value={sort === "beliebtheit" ? null : sort}
            options={SORT_OPTIONS.filter((o) => o.value !== "beliebtheit")}
            onChange={(next) => setSort(next ?? "beliebtheit")}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={favoritesOnly ? "default" : "ghost"}
            size="sm"
            className="w-fit"
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Star className={cn("size-4", favoritesOnly && "fill-current")} />
            Favoriten
          </Button>

          <Button
            variant={showRare ? "default" : "ghost"}
            size="sm"
            className="w-fit"
            onClick={toggleShowRare}
          >
            <Sparkles className="size-4" />
            {showRare ? "Ungewöhnliche gezeigt" : "Ungewöhnliche zeigen"}
          </Button>

          {hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setShowHidden((v) => !v)}
            >
              {showHidden ? <EyeOff /> : <Eye />}
              {showHidden ? "Ausgeblendete verbergen" : `${hiddenCount} ausgeblendete anzeigen`}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : grouped.length === 0 ? (
        <Card className="gap-0">
          <p className="px-(--card-spacing) text-sm text-muted-foreground">
            Keine Übung passt zu diesen Filtern.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((group) => {
            const open = gefiltert || openGroups.has(group.key);
            return (
            <Card key={group.key} className="gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.key)) next.delete(group.key);
                    else next.add(group.key);
                    return next;
                  })
                }
                aria-expanded={open}
                className="flex items-baseline justify-between px-(--card-spacing) text-left"
              >
                {/* Der Punkt trägt die Familienfarbe — dieselbe, die im
                    Kalender und auf den Kacheln steht. Hier lernt man sie
                    nebenbei, weil der Name direkt danebensteht. */}
                <span className="flex items-baseline gap-2">
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 self-center text-muted-foreground transition-transform",
                      open && "rotate-90"
                    )}
                  />
                  <span className={cn("size-2 shrink-0 translate-y-[-1px] rounded-full", TINT_FILL[MUSCLE_TINT[group.key]])} />
                  <h2 className="text-subheading font-display">{group.label}</h2>
                </span>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} · Standardsprung {defaultIncrement(group.key)} kg
                </span>
              </button>

              {open && (
              <div className="flex flex-col px-(--card-spacing)">
                {(expanded.has(group.key) ? group.items : group.items.slice(0, VORSCHAU)).map((exercise) => (
                  <div
                    key={exercise.id}
                    className={cn(
                      "flex items-center gap-2 border-b border-border py-2.5 last:border-0",
                      exercise.hidden && "opacity-50"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <ExerciseThumb exercise={exercise} />
                      <div className="min-w-0 flex-1">
                        <p className="flex min-w-0 items-center gap-1.5">
                          {/* Umbrechen statt abschneiden: das Gerät steht am
                              Ende des Namens und ist genau das, was die sechs
                              Bankdrück-Varianten voneinander unterscheidet. */}
                          <span className="min-w-0 line-clamp-2 text-sm">{exercise.name}</span>
                          <BewaehrtAbzeichen exercise={exercise} />
                        </p>
                        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <RankBars exercise={exercise} />
                          {zusatzZeile(exercise) && (
                            <span className="truncate">{zusatzZeile(exercise)}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy === exercise.id}
                      onClick={() => toggleFavorite(exercise.id, !exercise.favorite)}
                      aria-label={
                        exercise.favorite
                          ? `${exercise.name} aus Favoriten entfernen`
                          : `${exercise.name} als Favorit markieren`
                      }
                    >
                      <Star className={cn("size-4", exercise.favorite && "fill-current text-primary")} />
                    </Button>

                    {/* Bearbeiten, Ausblenden und Löschen zusammen unter
                        einem Knopf. Nebeneinander nahmen sie in einer 375 px
                        breiten Zeile so viel Platz, dass vom Gerät nur noch
                        „Langhantel · Mi…“ übrig blieb — und keine der drei
                        Handlungen kommt beim Durchsehen der Liste vor. Der
                        Stern bleibt draußen: der ist genau dafür da. Dasselbe
                        Muster wie in der laufenden Einheit. */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Weitere Aktionen für ${exercise.name}`}
                        className="touch-target flex size-8 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                      >
                        <Ellipsis className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(exercise)}>
                          <Pencil />
                          Bearbeiten
                        </DropdownMenuItem>
                        {exercise.equipment === "machine" &&
                          LADEARTEN.filter((a) => a === "steck" || a === "scheiben").map((art) => (
                            <DropdownMenuItem
                              key={art}
                              disabled={busy === exercise.id}
                              onClick={() => setzeLadeart(exercise, art)}
                            >
                              {exercise.ladeart === art ? <Check /> : <Weight />}
                              {LADEART_LABELS[art]}
                            </DropdownMenuItem>
                          ))}
                        <DropdownMenuItem
                          disabled={busy === exercise.id}
                          onClick={() => toggleHidden(exercise.id, !exercise.hidden)}
                        >
                          {exercise.hidden ? <Eye /> : <EyeOff />}
                          {exercise.hidden ? "Einblenden" : "Ausblenden"}
                        </DropdownMenuItem>
                        {exercise.isCustom && (
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={busy === exercise.id}
                            onClick={() => remove(exercise.id, exercise.name)}
                          >
                            <Trash2 />
                            Löschen
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {group.items.length > VORSCHAU && !expanded.has(group.key) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 w-fit"
                    onClick={() => setExpanded((prev) => new Set(prev).add(group.key))}
                  >
                    Alle {group.items.length} anzeigen
                  </Button>
                )}
              </div>
              )}
            </Card>
            );
          })}
        </div>
      )}

      <ExercisePicker
        open={creating}
        onOpenChange={setCreating}
        onPick={() => setCreating(false)}
        initialCreate
      />

      <ExerciseEditor
        exercise={editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />

    </div>
  );
}
