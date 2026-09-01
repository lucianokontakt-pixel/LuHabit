"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dumbbell } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
        // bg-elevated, nicht bg-muted: --muted und --card tragen denselben
        // Wert (#f2f2f3), die Fläche wäre in einer Karte also unsichtbar —
        // eine Übung ohne Bild hinterließe dort ein Loch statt eines Platzes.
        "relative size-14 shrink-0 overflow-hidden rounded-md bg-elevated",
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="56px"
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
 * Die Grenze, an der die Vergrößerung aufhört, hübsch zu sein.
 *
 * Die Quelldateien sind 180 × 180 px — mehr liefert der Datensatz nicht. Der
 * Dialog zog sie vorher auf die volle Breite (bis 448 px), also gut das
 * Zweieinhalbfache: daher die Treppen an jeder Kante. Bei 280 px hält die
 * Interpolation gerade noch, und was der Dialog dadurch an Fläche verliert,
 * bekommt er als Anleitung zurück.
 */
const MAX_GIF = 280;

/**
 * Die Übung in groß: die Animation in der Größe, die das Bild hergibt — und
 * darunter, wofür man sonst die Suchmaschine aufmacht.
 *
 * Hier standen einmal Zahlen und ein Maximum-Rechner; beides duplizierte, was
 * anderswo in der App schon steht, und flog wieder raus. Übrig blieb ein
 * Dialog, der nur ein Bild enthielt — und weil ein Bild allein leer aussieht,
 * wurde es aufgeblasen, bis es verpixelt war. Die Anleitung füllt den Platz mit
 * etwas, das ihn verdient: sie liegt seit dem Katalog-Umbau übersetzt in
 * public/uebungen/anleitungen-de.json und wurde bis jetzt nirgends angezeigt.
 */
export function ExerciseDetail({
  exercise,
  onOpenChange,
}: {
  exercise: Exercise | null;
  onOpenChange: (open: boolean) => void;
}) {
  const gif = exercise ? gifUrl(exercise) : null;
  // Die Übungs-ID liegt beim Text: sonst stünde nach dem Wechsel für einen
  // Moment die Anleitung der vorigen Übung unter dem neuen Bild.
  const [anleitung, setAnleitung] = useState<{ id: string; schritte: string[] } | null>(null);
  const schritte = anleitung && anleitung.id === exercise?.id ? anleitung.schritte : [];

  useEffect(() => {
    if (!exercise) return;
    let aktuell = true;
    const id = exercise.id;
    void loadInstructions(id).then((s) => {
      if (aktuell) setAnleitung({ id, schritte: s });
    });
    return () => {
      aktuell = false;
    };
  }, [exercise]);

  return (
    <Dialog open={exercise !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-3 overflow-y-auto sm:max-w-md">
        {exercise && (
          <>
            <DialogTitle className="pr-8 text-subheading font-display">
              {exercise.name}
            </DialogTitle>

            {gif && (
              /* bg-white statt bg-muted: die Illustrationen sind selbst weiß
                 hinterlegt, nicht transparent — auf grauem Grund stand deshalb
                 ein sichtbarer Rand um jedes Bild, als läge es in einer eigenen
                 Box. Bewusst fest statt themefähig, aus demselben Grund wie im
                 dunklen Modus des Bilds selbst. */
              <div
                className="relative mx-auto aspect-square w-full overflow-hidden rounded-panel bg-white"
                style={{ maxWidth: MAX_GIF }}
              >
                <Image
                  src={gif}
                  alt={`Bewegungsablauf: ${exercise.name}`}
                  fill
                  sizes={`${MAX_GIF}px`}
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {MUSCLE_LABELS[exercise.muscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
            </p>

            {schritte.length > 0 && (
              <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-sm text-muted-foreground marker:text-xs">
                {schritte.map((schritt, i) => (
                  <li key={i} className="pl-1">
                    {schritt}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
