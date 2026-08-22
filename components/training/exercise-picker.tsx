"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Check } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useTraining } from "@/lib/training-store";
import { createExercise } from "@/lib/api-training";
import {
  EQUIPMENT_LABELS,
  MUSCLES,
  MUSCLE_LABELS,
  type Equipment,
  type Exercise,
  type Muscle,
} from "@/lib/training";
import { WARMUP_OPTIONS } from "@/lib/warmup";

const EQUIPMENT_KEYS = Object.keys(EQUIPMENT_LABELS) as Equipment[];

export function ExercisePicker({
  open,
  onOpenChange,
  onPick,
  excludeIds = [],
  initialCreate = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exercise: Exercise) => void;
  excludeIds?: string[];
  /** Öffnet direkt das Formular für eine eigene Übung statt der Bibliothek. */
  initialCreate?: boolean;
}) {
  const { exercises, upsertExercise } = useTraining();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "all">("all");
  const [creating, setCreating] = useState(initialCreate);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState<Muscle>("chest");
  const [newEquipment, setNewEquipment] = useState<Equipment>("barbell");
  const [newWarmup, setNewWarmup] = useState<"always" | "never" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => !e.hidden)
      .filter((e) => (muscle === "all" ? true : e.muscle === muscle))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true));
  }, [exercises, muscle, query]);

  const grouped = useMemo(() => {
    const map = new Map<Muscle, Exercise[]>();
    for (const e of visible) {
      const list = map.get(e.muscle) ?? [];
      list.push(e);
      map.set(e.muscle, list);
    }
    return MUSCLES.map((m) => ({ muscle: m.key, label: m.label, items: map.get(m.key) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [visible]);

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
          <DialogTitle>Übung hinzufügen</DialogTitle>
          <DialogDescription>
            Aus der Bibliothek wählen oder eine eigene Übung anlegen.
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
                Alle
              </button>
              {MUSCLES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMuscle(m.key)}
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

            <div className="-mx-1 flex-1 overflow-y-auto px-1">
              {grouped.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Keine Übung gefunden.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {grouped.map((group) => (
                    <div key={group.muscle} className="flex flex-col gap-1">
                      <p className="px-1 text-xs text-muted-foreground">{group.label}</p>
                      {group.items.map((exercise) => {
                        const already = excluded.has(exercise.id);
                        return (
                          <button
                            key={exercise.id}
                            type="button"
                            onClick={() => {
                              onPick(exercise);
                              onOpenChange(false);
                            }}
                            className="flex items-center justify-between gap-3 rounded-field px-3 py-2.5 text-left transition-colors hover:bg-card"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm">{exercise.name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {EQUIPMENT_LABELS[exercise.equipment]}
                                {exercise.isCustom ? " · eigene" : ""}
                              </span>
                            </span>
                            {already && (
                              <Check className="size-4 shrink-0 text-muted-foreground" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
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

export { MUSCLE_LABELS };
