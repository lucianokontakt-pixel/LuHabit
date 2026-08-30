"use client";

import { useState } from "react";
import { ArrowLeftRight, ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/training/number-field";
import { ExercisePicker } from "@/components/training/exercise-picker";
import { ExerciseDetail, ExerciseThumb } from "@/components/training/exercise-media";
import { useDragSort } from "@/lib/use-drag-sort";
import { useTraining } from "@/lib/training-store";
import {
  EQUIPMENT_LABELS,
  WEEKDAY_NAMES,
  defaultIncrement,
  type Exercise,
} from "@/lib/training";
import { cn } from "@/lib/utils";

export type EditExercise = {
  key: string;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  increment: number | null;
  startWeight: number | null;
};

export type EditDay = {
  key: string;
  name: string;
  weekday: number | null;
  exercises: EditExercise[];
};

export function DayEditor({
  day,
  onChange,
  onRemove,
}: {
  day: EditDay;
  onChange: (day: EditDay) => void;
  onRemove: () => void;
}) {
  const { exerciseById } = useTraining();
  const [picking, setPicking] = useState(false);
  /** Der Platz (key), der gerade getauscht wird — null heißt: es wird dazugenommen. */
  const [tauschFuer, setTauschFuer] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Beim Zusammenstellen eines Plans steht man oft vor einem Namen, den man aus
  // der Bibliothek übernommen, aber nie ausgeführt hat. Das Vorschaubild zeigt,
  // welche Übung gemeint ist, das Antippen die Animation und die Anleitung.
  const [detail, setDetail] = useState<Exercise | null>(null);

  const order = day.exercises.map((e) => e.key);

  function reorder(nextOrder: string[]) {
    const byKey = new Map(day.exercises.map((e) => [e.key, e]));
    onChange({
      ...day,
      exercises: nextOrder.map((k) => byKey.get(k)).filter((e): e is EditExercise => Boolean(e)),
    });
  }

  const { displayOrder, draggingId, setItemRef, dragHandlers } = useDragSort(order, reorder);
  const byKey = new Map(day.exercises.map((e) => [e.key, e]));

  function patchExercise(key: string, patch: Partial<EditExercise>) {
    onChange({
      ...day,
      exercises: day.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    });
  }

  function addExercise(exercise: Exercise) {
    const entry: EditExercise = {
      key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      exerciseId: exercise.id,
      sets: 3,
      repMin: 8,
      repMax: 12,
      restSeconds: 120,
      increment: null,
      startWeight: null,
    };
    onChange({ ...day, exercises: [...day.exercises, entry] });
    setExpanded(entry.key);
  }

  /**
   * Die Bewegung an einem Platz austauschen — Sätze, Wiederholungen und Pause
   * bleiben, wie sie programmiert waren. Sprung und Startgewicht nicht: die
   * waren auf die alte Übung eingestellt (dieselbe Regel wie beim Tausch im
   * laufenden Training, siehe session-client.tsx).
   */
  function swapExercise(key: string, exercise: Exercise) {
    patchExercise(key, { exerciseId: exercise.id, increment: null, startWeight: null });
  }

  return (
    <Card className="gap-4">
      <div className="flex items-center gap-2 px-(--card-spacing)">
        <Input
          value={day.name}
          onChange={(e) => onChange({ ...day, name: e.target.value })}
          placeholder="Name des Tages"
          aria-label="Name des Tages"
          className="h-10 bg-elevated font-medium"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`${day.name || "Tag"} entfernen`}
          className="shrink-0 hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 px-(--card-spacing)">
        <p className="text-[11px] text-muted-foreground">Fester Wochentag (optional)</p>
        <div className="-mx-4 flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => onChange({ ...day, weekday: null })}
            className={cn(
              "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
              day.weekday === null
                ? "bg-primary text-primary-foreground"
                : "bg-elevated text-muted-foreground hover:text-foreground"
            )}
          >
            Rotation
          </button>
          {WEEKDAY_NAMES.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() =>
                onChange({ ...day, weekday: day.weekday === index ? null : index })
              }
              className={cn(
                "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
                day.weekday === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated text-muted-foreground hover:text-foreground"
              )}
            >
              {name.slice(0, 2)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-(--card-spacing)">
        {day.exercises.length === 0 && (
          <p className="rounded-panel bg-elevated/60 px-3 py-4 text-center text-sm text-muted-foreground">
            Noch keine Übung an diesem Tag.
          </p>
        )}

        {displayOrder.map((key) => {
          const entry = byKey.get(key);
          if (!entry) return null;
          const exercise = exerciseById[entry.exerciseId];
          const isOpen = expanded === key;
          const increment = entry.increment ?? (exercise ? defaultIncrement(exercise.muscle) : 2.5);

          return (
            <div
              key={key}
              ref={(el) => setItemRef(key, el)}
              className={cn(
                "rounded-panel bg-elevated ring-1 ring-foreground/8",
                draggingId === key && "relative z-20 shadow-float"
              )}
            >
              <div className="flex items-center gap-1 p-2.5">
                <span
                  {...dragHandlers(key)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${exercise?.name ?? "Übung"} verschieben`}
                  className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
                >
                  <GripVertical className="size-4" />
                </span>

                {/* Eigener Knopf statt Teil der Zeile: die Zeile klappt die
                    Vorgaben auf, das Bild zeigt die Übung. Zwei verschiedene
                    Absichten, also zwei Ziele. */}
                <button
                  type="button"
                  onClick={() => exercise && setDetail(exercise)}
                  disabled={!exercise}
                  aria-label={`${exercise?.name ?? "Übung"} ansehen`}
                  className="shrink-0 rounded-md transition-opacity hover:opacity-80 disabled:opacity-100"
                >
                  <ExerciseThumb
                    exercise={exercise ?? { id: entry.exerciseId, name: "", media: null }}
                    className="size-10"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : key)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    {/* Umbrechen statt abschneiden: "Schulterdrücken (sitzend,
                        Kurzhantel)" braucht 253 px, die Spalte hat auf einem
                        375er-Handy 151. Abgeschnitten fehlt genau der Teil, der
                        die Übung von ihren Geschwistern unterscheidet — das
                        Gerät steht am Ende des Namens. */}
                    <span className="line-clamp-2 text-sm font-medium">
                      {exercise?.name ?? entry.exerciseId}
                    </span>
                    {/* Nur Sätze und Pause stehen immer da. Sprung und
                        Startgewicht erscheinen erst, wenn sie vom Standard
                        abweichen — sonst schöbe eine Zeile aus lauter
                        Selbstverständlichkeiten das Wesentliche aus dem Bild.
                        Die Muskelgruppe sagt jetzt das Vorschaubild. */}
                    <span className="block truncate text-xs text-muted-foreground">
                      {entry.sets} × {entry.repMin}–{entry.repMax} · {entry.restSeconds}s Pause
                      {entry.increment !== null ? ` · +${entry.increment} kg` : ""}
                      {entry.startWeight !== null ? ` · ab ${entry.startWeight} kg` : ""}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setTauschFuer(key);
                    setPicking(true);
                  }}
                  aria-label={`${exercise?.name ?? "Übung"} tauschen`}
                  className="shrink-0"
                >
                  <ArrowLeftRight />
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    onChange({
                      ...day,
                      exercises: day.exercises.filter((e) => e.key !== key),
                    })
                  }
                  aria-label={`${exercise?.name ?? "Übung"} entfernen`}
                  className="shrink-0 hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>

              {isOpen && (
                <div className="grid grid-cols-2 gap-2.5 border-t border-border p-3 sm:grid-cols-3">
                  <NumberField
                    id={`${key}-sets`}
                    label="Sätze"
                    value={entry.sets}
                    min={1}
                    max={12}
                    onChange={(v) => patchExercise(key, { sets: Math.max(1, v ?? 1) })}
                  />
                  <NumberField
                    id={`${key}-repmin`}
                    label="Wdh. von"
                    value={entry.repMin}
                    min={1}
                    max={50}
                    onChange={(v) => {
                      const repMin = Math.max(1, v ?? 1);
                      patchExercise(key, {
                        repMin,
                        repMax: Math.max(repMin, entry.repMax),
                      });
                    }}
                  />
                  <NumberField
                    id={`${key}-repmax`}
                    label="Wdh. bis"
                    value={entry.repMax}
                    min={1}
                    max={50}
                    onChange={(v) =>
                      patchExercise(key, { repMax: Math.max(entry.repMin, v ?? entry.repMin) })
                    }
                  />
                  <NumberField
                    id={`${key}-rest`}
                    label="Pause"
                    suffix="s"
                    value={entry.restSeconds}
                    min={0}
                    max={600}
                    step={15}
                    onChange={(v) => patchExercise(key, { restSeconds: Math.max(0, v ?? 0) })}
                  />
                  <NumberField
                    id={`${key}-increment`}
                    label="Sprung"
                    suffix="kg"
                    value={entry.increment}
                    min={0.25}
                    step={0.25}
                    placeholder={String(increment)}
                    onChange={(v) => patchExercise(key, { increment: v })}
                  />
                  <NumberField
                    id={`${key}-start`}
                    label="Startgewicht"
                    suffix="kg"
                    value={entry.startWeight}
                    min={0}
                    step={0.5}
                    placeholder="auto"
                    onChange={(v) => patchExercise(key, { startWeight: v })}
                  />
                  <p className="col-span-full text-[11px] leading-relaxed text-muted-foreground">
                    Leer lassen heißt: Sprung nach Muskelgruppe (
                    {exercise ? `${defaultIncrement(exercise.muscle)} kg` : "2,5 kg"}) und
                    Startgewicht aus deinem Körpergewicht.
                    {exercise ? ` Gerät: ${EQUIPMENT_LABELS[exercise.equipment]}.` : ""}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-(--card-spacing)">
        <Button variant="outline" className="w-full" onClick={() => setPicking(true)}>
          <Plus />
          Übung hinzufügen
        </Button>
      </div>

      <ExercisePicker
        open={picking}
        onOpenChange={(open) => {
          setPicking(open);
          if (!open) setTauschFuer(null);
        }}
        onPick={(exercise) => {
          if (tauschFuer) {
            swapExercise(tauschFuer, exercise);
          } else {
            addExercise(exercise);
          }
          setTauschFuer(null);
        }}
        excludeIds={day.exercises
          .filter((e) => e.key !== tauschFuer)
          .map((e) => e.exerciseId)}
        title={tauschFuer ? "Übung tauschen" : "Übung hinzufügen"}
        description={
          tauschFuer
            ? "Der Ersatz behält Sätze, Wiederholungen und Pause dieses Platzes."
            : "Aus der Bibliothek wählen oder eine eigene Übung anlegen."
        }
      />

      <ExerciseDetail exercise={detail} onOpenChange={(open) => !open && setDetail(null)} />
    </Card>
  );
}
