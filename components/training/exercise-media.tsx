"use client";

import Image from "next/image";
import { Dumbbell } from "lucide-react";
import { gifUrl, imageUrl } from "@/lib/exercise-catalog";
import { type Exercise } from "@/lib/training";
import { cn } from "@/lib/utils";

/**
 * Das Standbild in Listen. Bewusst nicht das GIF: bei 1295 Übungen liefen sonst
 * Dutzende Animationen gleichzeitig, sobald jemand scrollt.
 *
 * Ausnahme über `animiert`: die eine Übung, die gerade offen ist, darf sich
 * bewegen — dort läuft ohnehin nur eine einzige Animation, nicht Dutzende.
 */
export function ExerciseThumb({
  exercise,
  className,
  animiert = false,
}: {
  exercise: Pick<Exercise, "id" | "name" | "media">;
  className?: string;
  animiert?: boolean;
}) {
  const src = (animiert && gifUrl(exercise)) || imageUrl(exercise);
  return (
    <div
      className={cn(
        // 80 px ist die Obergrenze, nicht Geschmack: die Quelldateien sind
        // 180 × 180 px, auf einem Handy mit doppelter Pixeldichte deckt ein
        // 80er-Kasten also genau 160 echte Pixel ab. Alles darüber rechnet das
        // Bild hoch und wird weich — und kleiner als das erkennt man bei einer
        // Ganzkörper-Illustration kaum, welche Übung gemeint ist.
        //
        // bg-elevated, nicht bg-muted: --muted und --card tragen denselben
        // Wert (#f2f2f3), die Fläche wäre in einer Karte also unsichtbar —
        // eine Übung ohne Bild hinterließe dort ein Loch statt eines Platzes.
        "relative size-20 shrink-0 overflow-hidden rounded-md bg-elevated",
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="80px"
          loading="lazy"
          className="object-cover"
          unoptimized
        />
      ) : (
        <Dumbbell className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
}
