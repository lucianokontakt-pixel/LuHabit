"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dumbbell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gifUrl, imageUrl, loadInstructions } from "@/lib/exercise-catalog";
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Exercise } from "@/lib/training";
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
        "relative size-11 shrink-0 overflow-hidden rounded-md bg-muted",
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
 * Die Übung in groß: die Animation zeigt die Bewegung, darunter steht die
 * Anleitung. Sie kommt aus einer eigenen Datei und wird erst hier geladen —
 * 600 KB Text gehören nicht in jeden Seitenaufruf.
 */
export function ExerciseDetail({
  exercise,
  onOpenChange,
}: {
  exercise: Exercise | null;
  onOpenChange: (open: boolean) => void;
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

  const steps = exercise && loaded?.id === exercise.id ? loaded.steps : [];
  const gif = exercise ? gifUrl(exercise) : null;

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

            {gif && (
              <div className="relative aspect-square w-full overflow-hidden rounded-card bg-muted">
                <Image
                  src={gif}
                  alt={`Bewegungsablauf: ${exercise.name}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}

            {steps.length > 0 && (
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
                {steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}

            {exercise.en && exercise.en !== exercise.name && (
              <p className="text-xs text-muted-foreground">Original: {exercise.en}</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
