"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dumbbell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OneRepMaxCalculator } from "@/components/training/one-rep-max";
import { gifUrl, imageUrl, loadInstructions } from "@/lib/exercise-catalog";
import { useTraining } from "@/lib/training-store";
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  bestEffortLabel,
  bestOneRepMax,
  formatLoggedSets,
  workingSets,
  type Exercise,
} from "@/lib/training";
import { formatDayLabel } from "@/lib/format";
import { todayISO } from "@/lib/datum";
import { cn } from "@/lib/utils";

/**
 * Das Standbild in Listen. Bewusst nicht das GIF: bei 1295 Übungen liefen sonst
 * Dutzende Animationen gleichzeitig, sobald jemand scrollt.
 */
export function ExerciseThumb({
  exercise,
  className,
}: {
  exercise: Pick<Exercise, "id" | "name" | "media">;
  className?: string;
}) {
  const src = imageUrl(exercise);
  return (
    <div
      className={cn(
        // bg-elevated, nicht bg-muted: --muted und --card tragen denselben
        // Wert (#f2f2f3), die Fläche wäre in einer Karte also unsichtbar —
        // eine Übung ohne Bild hinterließe dort ein Loch statt eines Platzes.
        "relative size-11 shrink-0 overflow-hidden rounded-md bg-elevated",
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="44px"
          loading="lazy"
          className="object-cover"
          unoptimized
        />
      ) : (
        <Dumbbell className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
}

/**
 * Die Übung in groß: die Animation zeigt die Bewegung, darunter stehen deine
 * Zahlen, der Maximum-Rechner und die Anleitung.
 *
 * Die Zahlen kommen vor die Anleitung: wie eine Übung geht, schlägt man einmal
 * nach — wo man bei ihr steht, immer wieder. Die Anleitung selbst liegt in
 * einer eigenen Datei und wird erst hier geladen, 600 KB Text gehören nicht in
 * jeden Seitenaufruf.
 */
export function ExerciseDetail({
  exercise,
  onOpenChange,
  onAddToPlan,
}: {
  exercise: Exercise | null;
  onOpenChange: (open: boolean) => void;
  /**
   * Optional: macht aus dem Nachschlagen ein Übernehmen. Nur die Bibliothek
   * gibt das mit — in der laufenden Einheit oder im Plan-Editor steht man
   * bereits dort, wo der Knopf hinführen würde.
   */
  onAddToPlan?: (exercise: Exercise) => void;
}) {
  // Die geladene Anleitung trägt ihre Übungs-ID mit sich. Sonst stünde beim
  // Wechsel auf die nächste Übung kurz noch die Anleitung der vorigen da.
  const [loaded, setLoaded] = useState<{ id: string; steps: string[] } | null>(null);

  useEffect(() => {
    if (!exercise) return;
    let aktuell = true;
    const id = exercise.id;
    loadInstructions(id).then((steps) => {
      if (aktuell) setLoaded({ id, steps });
    });
    return () => {
      aktuell = false;
    };
  }, [exercise]);

  const { loggedFor } = useTraining();
  const today = todayISO();

  const steps = exercise && loaded?.id === exercise.id ? loaded.steps : [];
  const gif = exercise ? gifUrl(exercise) : null;

  const history = exercise ? loggedFor(exercise.id) : [];
  const best = bestOneRepMax(history);
  const bestLabel = bestEffortLabel(history.map((h) => h.sets));
  const last = history[0];
  const lastSets = last ? workingSets(last.sets) : [];
  // Der Rechner startet bei dem Satz, der die beste Schätzung hergibt; sonst
  // beim letzten protokollierten, sonst bei etwas, das man drehen kann.
  const startWeight = best?.weight ?? lastSets[0]?.weight ?? 20;
  const startReps = best?.reps ?? lastSets[0]?.reps ?? 5;

  return (
    <Dialog open={exercise !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {exercise && (
          <>
            <DialogHeader>
              <DialogTitle>{exercise.name}</DialogTitle>
              <DialogDescription>
                {MUSCLE_LABELS[exercise.muscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
                {exercise.secondary.length > 0 &&
                  ` · dazu ${exercise.secondary.map((m) => MUSCLE_LABELS[m]).join(", ")}`}
              </DialogDescription>
            </DialogHeader>

            {/* Der Dialog selbst ist ein Grid mit begrenzter Höhe. Darin
                schrumpft die Medienbox mit, sobald der Inhalt darunter wächst —
                sie hat nur ein Seitenverhältnis und keine eigene Höhe, an der
                sich das Grid festhalten könnte, und lief dann über die Zahlen.
                Eine Flex-Spalte mit shrink-0 an der Box hält alles gestapelt.

                Feste Höhe statt aspect-square: ein quadratisches Bild über die
                volle Breite füllte auf dem Handy fast den ganzen Dialog — für
                ein Popup, das man kurz aufruft und wieder schließt, zu viel. */}
            <div className="flex min-w-0 flex-col gap-4">
              {gif && (
                <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-card bg-muted">
                  <Image
                    src={gif}
                    alt={`Bewegungsablauf: ${exercise.name}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 384px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}

              {(bestLabel || last) && (
                <div className="flex flex-col gap-1 text-sm">
                  {bestLabel && (
                    <p className="text-muted-foreground">
                      Bestwert <span className="nums text-foreground">{bestLabel}</span>
                    </p>
                  )}
                  {last && (
                    <p className="text-muted-foreground">
                      Letztes Mal ({formatDayLabel(last.date, today)}):{" "}
                      <span className="nums text-foreground">{formatLoggedSets(lastSets)}</span>
                    </p>
                  )}
                </div>
              )}

              <OneRepMaxCalculator
                key={exercise.id}
                startWeight={startWeight}
                startReps={startReps}
                best={best}
              />

              {steps.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">So geht&apos;s</h3>
                  {/* Die Ziffer als eigene Fläche statt als Listenpunkt: beim
                      Nachmachen sucht man den Schritt, an dem man ist, und ein
                      graues "3." im Fließtext findet der Blick nicht wieder. */}
                  <ol className="flex flex-col gap-2.5">
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="nums mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-elevated text-[11px] text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-sm leading-snug">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {exercise.en && exercise.en !== exercise.name && (
                <p className="text-xs text-muted-foreground">Original: {exercise.en}</p>
              )}

              {/* Ganz unten, nicht oben: wer hier landet, will erst wissen, wie
                  die Übung geht — der Knopf ist die Antwort auf „die nehme
                  ich", und die kommt nach dem Lesen. */}
              {onAddToPlan && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onAddToPlan(exercise)}
                >
                  <Plus />
                  Zu einem Trainingstag hinzufügen
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
