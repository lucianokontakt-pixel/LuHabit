"use client";

import Image from "next/image";
import { Dumbbell } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { gifUrl, imageUrl } from "@/lib/exercise-catalog";
import { type Exercise } from "@/lib/training";
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
 * Die Übung in groß — nur die Animation, sonst nichts. Zahlen, Anleitung, ein
 * Maximum-Rechner standen hier alle einmal; jedes davon duplizierte, was
 * anderswo in der App schon steht (Bestwert und letzter Satz zum Beispiel in
 * der laufenden Einheit selbst, siehe session-client.tsx). Übrig blieb, wofür
 * man diesen Dialog wirklich öffnet: sehen, wie die Bewegung aussieht.
 */
export function ExerciseDetail({
  exercise,
  onOpenChange,
}: {
  exercise: Exercise | null;
  onOpenChange: (open: boolean) => void;
}) {
  const gif = exercise ? gifUrl(exercise) : null;

  return (
    <Dialog open={exercise !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-hidden p-0 sm:max-w-md">
        {exercise && (
          <>
            {/* Für Screenreader — sichtbar ist hier ausschließlich das Bild.
                Der Schließen-Knopf bleibt: ohne ihn gäbe es auf dem Handy
                keinen Weg zurück außer dem Antippen des Hintergrunds. */}
            <DialogTitle className="sr-only">{exercise.name}</DialogTitle>
            {/* bg-white statt bg-muted: die Illustrationen sind selbst weiß
                hinterlegt, nicht transparent — auf grauem Grund stand deshalb
                ein sichtbarer Rand um jedes Bild, als läge es in einer eigenen
                Box. Bewusst fest statt themefähig, aus demselben Grund wie im
                dunklen Modus des Bilds selbst. */}
            {gif && (
              <div className="relative aspect-square w-full bg-white">
                <Image
                  src={gif}
                  alt={`Bewegungsablauf: ${exercise.name}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 448px"
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
