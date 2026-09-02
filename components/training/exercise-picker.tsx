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
  MUSCLES,
  MUSCLE_LABELS,
  RANK_SICHTBAR_AB,
  REGIONS,
  REGION_SHORT,
  kurzerName,
  stufeVon,
  type Equipment,
  type Exercise,
  type Muscle,
  type Region,
} from "@/lib/training";
import { WARMUP_OPTIONS } from "@/lib/warmup";

const EQUIPMENT_KEYS = EQUIPMENT;

/**
 * So viele Treffer zeigt die Auswahl höchstens. Die Bibliothek hat rund 1300
 * Übungen — wer ohne Filter öffnet, will ohnehin erst suchen, und ein Dialog
 * mit tausend Zeilen ruckelt auf dem Handy.
 */
const MAX_TREFFER = 60;

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
  const { exercises, upsertExercise } = useTraining();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => !e.hidden)
      .filter((e) => showRare || e.favorite || stufeVon(e) >= RANK_SICHTBAR_AB)
      .filter((e) => (muscle === null ? true : e.muscle === muscle))
      .filter((e) => (equipment === null ? true : e.equipment === equipment))
      .filter((e) => (region === null ? true : e.region === region))
      // Auch der englische Originalname zählt — wer "bench press" tippt, soll
      // Bankdrücken finden.
      .filter((e) =>
        q
          ? e.name.toLowerCase().includes(q) || (e.en?.toLowerCase().includes(q) ?? false)
          : true
      );
  }, [exercises, muscle, equipment, region, query, showRare]);

  const regionOptions = useMemo(
    () =>
      REGIONS.filter((r) => muscle === null || r.muscle === muscle).map((r) => ({
        value: r.key,
        label: r.label,
        hint: muscle === null ? MUSCLE_LABELS[r.muscle] : undefined,
      })),
    [muscle]
  );

  const zuViele = Math.max(0, visible.length - MAX_TREFFER);

  const grouped = useMemo(() => {
    const map = new Map<Muscle, Exercise[]>();
    // Beim Tausch die nächstliegenden zuerst durch den Deckel lassen — sonst
    // schnitte MAX_TREFFER alphabetisch ab und würfe die besten Treffer weg.
    const kandidaten = naeheZu
      ? [...visible].sort((a, b) => naeheZu(b) - naeheZu(a))
      : visible;
    for (const e of kandidaten.slice(0, MAX_TREFFER)) {
      const list = map.get(e.muscle) ?? [];
      list.push(e);
      map.set(e.muscle, list);
    }
    // Beim Tausch entscheidet zuerst, wie nah die Übung an der getauschten
    // liegt — danach wie sonst: Favoriten, dann die übliche vor der
    // ungewöhnlichen, dann alphabetisch.
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (naeheZu ? naeheZu(b) - naeheZu(a) : 0) ||
          Number(b.favorite) - Number(a.favorite) ||
          stufeVon(b) - stufeVon(a) ||
          a.name.localeCompare(b.name, "de")
      );
    }
    return MUSCLES.map((m) => ({ muscle: m.key, label: m.label, items: map.get(m.key) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [visible, naeheZu]);

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
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setNewMuscle(m.key)}
                    className={cn(
                      "rounded-pill px-3 py-1.5 text-xs transition-colors",
                      newMuscle === m.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Gerät</Label>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewEquipment(key)}
                    className={cn(
                      "rounded-pill px-3 py-1.5 text-xs transition-colors",
                      newEquipment === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {EQUIPMENT_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Aufwärmsatz</Label>
              <div className="flex flex-wrap gap-1.5">
                {WARMUP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value ?? "auto"}
                    type="button"
                    onClick={() => setNewWarmup(opt.value)}
                    className={cn(
                      "rounded-pill px-3 py-1.5 text-xs transition-colors",
                      newWarmup === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {newEquipment === "bodyweight" && newWarmup === "always"
                  ? "Wirkt nur mit eingetragenem Zusatzgewicht — bei 0 kg gibt es nichts abzustufen."
                  : "Automatisch: die erste Übung des Tages immer, sonst ab 40 kg Arbeitsgewicht."}
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

            {/* Zwei Stellschrauben statt einer: der Gerätefilter fehlte hier
                bis jetzt ganz — und genau der ist gefragt, wenn ein Gerät
                besetzt ist und man dieselbe Bewegung woanders sucht. */}
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
              {regionOptions.length > 0 && (
                <FilterSelect
                  label="Bereich"
                  allLabel="Alle Bereiche"
                  value={region}
                  options={regionOptions}
                  onChange={setRegion}
                />
              )}
            </div>

            <div className="-mx-1 flex-1 overflow-y-auto px-1">
              {grouped.length === 0 ? (
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
                  {grouped.map((group) => (
                    <div key={group.muscle} className="flex flex-col gap-1">
                      <p className="px-1 text-xs text-muted-foreground">{group.label}</p>
                      {group.items.map((exercise) => {
                        const already = excluded.has(exercise.id);
                        return (
                          <div
                            key={exercise.id}
                            className="flex items-center gap-1 rounded-field transition-colors hover:bg-card"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onPick(exercise);
                                onOpenChange(false);
                              }}
                              className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
                            >
                              <ExerciseThumb exercise={exercise} className="size-11" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm">{exercise.name}</span>
                                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                  <RankBars exercise={exercise} />
                                  <span className="truncate">
                                    {EQUIPMENT_LABELS[exercise.equipment]}
                                    {exercise.region ? ` · ${REGION_SHORT[exercise.region]}` : ""}
                                    {exercise.isCustom ? " · eigene" : ""}
                                  </span>
                                </span>
                              </span>
                              {already && (
                                <Check className="size-4 shrink-0 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={favoriteBusy === exercise.id}
                              onClick={() => toggleFavorite(exercise)}
                              aria-label={
                                exercise.favorite
                                  ? `${exercise.name} aus Favoriten entfernen`
                                  : `${exercise.name} als Favorit markieren`
                              }
                              className="shrink-0 p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                            >
                              <Star
                                className={cn(
                                  "size-4",
                                  exercise.favorite && "fill-current text-primary"
                                )}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {zuViele > 0 && (
                    <p className="px-1 py-1 text-xs text-muted-foreground">
                      {zuViele} weitere Übungen — such nach dem Namen oder grenze mit
                      Muskel, Gerät und Bereich ein.
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
