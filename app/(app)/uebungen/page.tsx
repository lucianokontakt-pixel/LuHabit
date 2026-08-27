"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExercisePicker } from "@/components/training/exercise-picker";
import { ExerciseEditor } from "@/components/training/exercise-editor";
import { ExerciseDetail, ExerciseThumb } from "@/components/training/exercise-media";
import { useTraining } from "@/lib/training-store";
import { deleteExercise, updateExercise } from "@/lib/api-training";
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLES,
  defaultIncrement,
  type Equipment,
  type Exercise,
  type Muscle,
} from "@/lib/training";
import { cn } from "@/lib/utils";

const EQUIPMENT_KEYS = EQUIPMENT;

/**
 * Wie viele Übungen eine Muskelgruppe zeigt, bevor sie aufgeklappt werden will.
 * Die Bibliothek hat rund 1300 Einträge — ungebremst stünden hier gut tausend
 * Zeilen samt Vorschaubild im Dokument, nur damit jemand nach unten wischt.
 */
const VORSCHAU = 24;

export default function ExercisesPage() {
  const { exercises, upsertExercise, reload, loading } = useTraining();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [showHidden, setShowHidden] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [expanded, setExpanded] = useState<Set<Muscle>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => (showHidden ? true : !e.hidden))
      .filter((e) => (muscle === "all" ? true : e.muscle === muscle))
      .filter((e) => (equipment === "all" ? true : e.equipment === equipment))
      // Auch der englische Originalname zählt — wer "bench press" tippt, soll
      // Bankdrücken finden.
      .filter((e) =>
        q
          ? e.name.toLowerCase().includes(q) || (e.en?.toLowerCase().includes(q) ?? false)
          : true
      );
  }, [exercises, query, muscle, equipment, showHidden]);

  const grouped = useMemo(() => {
    const map = new Map<Muscle, typeof filtered>();
    for (const e of filtered) {
      const list = map.get(e.muscle) ?? [];
      list.push(e);
      map.set(e.muscle, list);
    }
    return MUSCLES.map((m) => ({ key: m.key, label: m.label, items: map.get(m.key) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [filtered]);

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
      <div>
        <p className="text-sm text-muted-foreground">
          {exercises.length} Übungen nach Muskelgruppe und Gerät
        </p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">
          Übungen
        </h1>
      </div>


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

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => setMuscle("all")}
            className={cn(
              "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
              muscle === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            Alle Muskeln
          </button>
          {MUSCLES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMuscle(muscle === m.key ? "all" : m.key)}
              className={cn(
                "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
                muscle === m.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => setEquipment("all")}
            className={cn(
              "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
              equipment === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            Alle Geräte
          </button>
          {EQUIPMENT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setEquipment(equipment === key ? "all" : key)}
              className={cn(
                "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
                equipment === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {EQUIPMENT_LABELS[key]}
            </button>
          ))}
        </div>

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

      {loading ? (
        <div className="h-64 animate-pulse rounded-card bg-card" />
      ) : grouped.length === 0 ? (
        <Card className="gap-0">
          <p className="px-(--card-spacing) text-sm text-muted-foreground">
            Keine Übung passt zu diesen Filtern.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((group) => (
            <Card key={group.key} className="gap-2">
              <div className="flex items-baseline justify-between px-(--card-spacing)">
                <h2 className="text-subheading font-display">{group.label}</h2>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} · Standardsprung {defaultIncrement(group.key)} kg
                </span>
              </div>

              <div className="flex flex-col px-(--card-spacing)">
                {(expanded.has(group.key) ? group.items : group.items.slice(0, VORSCHAU)).map((exercise) => (
                  <div
                    key={exercise.id}
                    className={cn(
                      "flex items-center gap-2 border-b border-border py-2.5 last:border-0",
                      exercise.hidden && "opacity-50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setDetail(exercise)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-label={`${exercise.name} ansehen`}
                    >
                      <ExerciseThumb exercise={exercise} />
                      <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{exercise.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {EQUIPMENT_LABELS[exercise.equipment]}
                        {exercise.increment !== null && ` · ${exercise.increment} kg Sprung`}
                        {/* Der Lastanteil erklärt, warum eine Übung ohne Hantel
                            überhaupt Volumen erzeugt. */}
                        {exercise.loadFactor !== null &&
                          exercise.loadFactor > 0 &&
                          ` · ${Math.round(exercise.loadFactor * 100)} % Last`}
                        {exercise.isCustom && " · eigene"}
                        {exercise.hidden && " · ausgeblendet"}
                      </p>
                      </div>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditing(exercise)}
                      aria-label={`${exercise.name} bearbeiten`}
                    >
                      <Pencil />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy === exercise.id}
                      onClick={() => toggleHidden(exercise.id, !exercise.hidden)}
                      aria-label={
                        exercise.hidden
                          ? `${exercise.name} einblenden`
                          : `${exercise.name} ausblenden`
                      }
                    >
                      {exercise.hidden ? <Eye /> : <EyeOff />}
                    </Button>

                    {exercise.isCustom && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy === exercise.id}
                        onClick={() => remove(exercise.id, exercise.name)}
                        aria-label={`${exercise.name} löschen`}
                        className="hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    )}
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
            </Card>
          ))}
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

      <ExerciseDetail
        exercise={detail}
        onOpenChange={(open) => !open && setDetail(null)}
      />
    </div>
  );
}
