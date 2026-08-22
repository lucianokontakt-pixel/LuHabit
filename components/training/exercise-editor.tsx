"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateExercise } from "@/lib/api-training";
import { useTraining } from "@/lib/training-store";
import {
  EQUIPMENT_LABELS,
  MUSCLES,
  defaultIncrement,
  type Equipment,
  type Exercise,
  type Muscle,
} from "@/lib/training";
import { WARMUP_OPTIONS } from "@/lib/warmup";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const EQUIPMENT_KEYS = Object.keys(EQUIPMENT_LABELS) as Equipment[];

/** Leeres Feld heißt „Standard" — nicht „null als Zahl". */
function toField(value: number | null): string {
  return value === null ? "" : String(value);
}

function fromField(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed.replace(",", "."));
  // undefined heißt: unbrauchbare Eingabe, der bisherige Wert bleibt stehen.
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Die Stellschrauben einer Übung: wie sie heißt, worauf sie zählt, in welchen
 * Schritten das Gewicht steigt und — bei Eigengewicht — wie viel Körpergewicht
 * sie bewegt. Bis hierher waren diese Werte nur über die Datenbank erreichbar.
 */
export function ExerciseEditor({
  exercise,
  onOpenChange,
}: {
  exercise: Exercise | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { upsertExercise } = useTraining();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<Muscle>("chest");
  const [equipment, setEquipment] = useState<Equipment>("barbell");
  const [increment, setIncrement] = useState("");
  const [loadFactor, setLoadFactor] = useState("");
  const [startFactor, setStartFactor] = useState("");
  const [warmup, setWarmup] = useState<"always" | "never" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Beim Öffnen die Werte der gewählten Übung übernehmen.
  useEffect(() => {
    if (!exercise) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- füllt das Formular einmalig beim Öffnen
    setName(exercise.name);
    setMuscle(exercise.muscle);
    setEquipment(exercise.equipment);
    setIncrement(toField(exercise.increment));
    setLoadFactor(toField(exercise.loadFactor));
    setStartFactor(toField(exercise.bodyweightFactor));
    setWarmup(exercise.warmup);
    setError(null);
  }, [exercise]);

  if (!exercise) return null;

  const isBodyweight = equipment === "bodyweight";

  async function handleSave() {
    if (!exercise) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Die Übung braucht einen Namen.");
      return;
    }

    const nextIncrement = fromField(increment);
    const nextLoad = fromField(loadFactor);
    const nextStart = fromField(startFactor);
    if (nextIncrement === undefined || nextLoad === undefined || nextStart === undefined) {
      setError("Die Zahlenfelder brauchen eine Zahl ab 0 — oder bleiben leer.");
      return;
    }

    setSaving(true);
    try {
      upsertExercise(
        await updateExercise({
          id: exercise.id,
          name: trimmed,
          muscle,
          equipment,
          increment: nextIncrement,
          loadFactor: nextLoad,
          bodyweightFactor: nextStart,
          warmup,
        })
      );
      toast.success(`„${trimmed}“ gespeichert`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Übung nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto rounded-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Übung bearbeiten</DialogTitle>
          <DialogDescription>
            Änderungen gelten auch rückwirkend für deinen Verlauf — die Sätze selbst bleiben, wie
            sie protokolliert wurden.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-exercise-name" className="text-xs text-muted-foreground">
              Name
            </Label>
            <Input
              id="edit-exercise-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Muskelgruppe</Label>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMuscle(m.key)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-xs transition-colors",
                    muscle === m.key
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
                  onClick={() => setEquipment(key)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-xs transition-colors",
                    equipment === key
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
            <Label htmlFor="edit-exercise-increment" className="text-xs text-muted-foreground">
              Gewichtssprung (kg)
            </Label>
            <Input
              id="edit-exercise-increment"
              type="number"
              min={0}
              step={0.25}
              inputMode="decimal"
              placeholder={`leer = ${formatNumber(defaultIncrement(muscle))} (Standard)`}
              value={increment}
              onChange={(e) => setIncrement(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Um wie viel das Gewicht steigt, wenn du den Wiederholungsbereich voll machst.
            </p>
          </div>

          {isBodyweight ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-exercise-load" className="text-xs text-muted-foreground">
                Lastanteil
              </Label>
              <Input
                id="edit-exercise-load"
                type="number"
                min={0}
                max={2}
                step={0.05}
                inputMode="decimal"
                placeholder="leer = zählt nicht ins Volumen"
                value={loadFactor}
                onChange={(e) => setLoadFactor(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Anteil deines Körpergewichts, den die Übung bewegt — fürs Volumen. Klimmzüge 1,
                Dips 0,95, Liegestütze 0,65. 0 heißt: kein sinnvoller kg-Wert, etwa beim Plank.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-exercise-start" className="text-xs text-muted-foreground">
                Startgewicht-Faktor
              </Label>
              <Input
                id="edit-exercise-start"
                type="number"
                min={0}
                max={3}
                step={0.05}
                inputMode="decimal"
                placeholder="leer = kein Vorschlag"
                value={startFactor}
                onChange={(e) => setStartFactor(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Nur beim allerersten Mal: Vorschlag = dein Körpergewicht × Faktor.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Aufwärmsatz</Label>
            <div className="flex flex-wrap gap-1.5">
              {WARMUP_OPTIONS.map((opt) => (
                <button
                  key={opt.value ?? "auto"}
                  type="button"
                  onClick={() => setWarmup(opt.value)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-xs transition-colors",
                    warmup === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isBodyweight && warmup === "always"
                ? "Wirkt nur mit eingetragenem Zusatzgewicht — bei 0 kg gibt es nichts abzustufen."
                : "Automatisch: die erste Übung des Tages immer, sonst ab 40 kg Arbeitsgewicht."}
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Speichert…" : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
