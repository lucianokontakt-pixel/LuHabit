"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dumbbell, Info, Maximize2, Minimize2, Pause, Play } from "lucide-react";
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

const SIZE_KEY = "luhabit-gif-groesse";

/**
 * Die laufende Animation über der Satz-Tabelle.
 *
 * Tippen hält sie an und zeigt das Standbild — beim Nachmachen will man den
 * Endpunkt sehen, nicht die Schleife. Der Minimieren-Knopf schrumpft sie auf
 * einen Streifen, und diese Wahl bleibt: wer die Animation einmal weghaben
 * wollte, will sie bei der nächsten Übung nicht wieder vor sich haben.
 */
export function ExerciseMedia({
  exercise,
  onOpenDetail,
}: {
  exercise: Pick<Exercise, "id" | "name" | "media">;
  onOpenDetail?: () => void;
}) {
  const [playing, setPlaying] = useState(true);
  const [mini, setMini] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- liest die Einstellung einmalig beim Mount
      if (localStorage.getItem(SIZE_KEY) === "mini") setMini(true);
    } catch {
      // Kein Speicher, kein Problem — dann bleibt es bei groß.
    }
  }, []);

  const toggleSize = () => {
    setMini((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIZE_KEY, next ? "mini" : "voll");
      } catch {
        // Gilt dann nur für diese Sitzung.
      }
      return next;
    });
  };

  const gif = gifUrl(exercise);
  const still = imageUrl(exercise);
  if (!gif || !still) return null;

  const info = onOpenDetail && (
    <button
      type="button"
      onClick={onOpenDetail}
      aria-label={`${exercise.name} — Anleitung`}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        mini ? "text-muted-foreground" : "absolute top-2 right-2 bg-black/55 text-white backdrop-blur-sm"
      )}
    >
      <Info className="size-4" />
    </button>
  );

  // Klein heißt Zeile, nicht Streifen: ein schmales Bild mit den Bedienelementen
  // daneben. Ein breiter Kasten mit einem Briefmarkenbild in der Mitte wäre
  // dieselbe Höhe für weniger zu sehen.
  if (mini) {
    return (
      <div className="mx-(--card-spacing) flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSize}
          className="relative size-14 shrink-0 overflow-hidden rounded-md bg-white"
          aria-label={`${exercise.name} größer zeigen`}
        >
          <Image
            src={still}
            alt=""
            fill
            sizes="56px"
            className="object-contain"
            unoptimized
          />
        </button>
        <button
          type="button"
          onClick={toggleSize}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs text-muted-foreground"
        >
          <Maximize2 className="size-3.5 shrink-0" />
          Bewegung größer zeigen
        </button>
        {info}
      </div>
    );
  }

  return (
    <div className="relative mx-(--card-spacing) aspect-square overflow-hidden rounded-card bg-white">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="absolute inset-0 size-full"
        aria-label={playing ? `${exercise.name} anhalten` : `${exercise.name} abspielen`}
      >
        <Image
          src={playing ? gif : still}
          alt={`Bewegungsablauf: ${exercise.name}`}
          fill
          sizes="(max-width: 640px) 100vw, 480px"
          className="object-contain"
          unoptimized
        />
      </button>

      <button
        type="button"
        onClick={toggleSize}
        className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-pill bg-black/55 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm"
      >
        <Minimize2 className="size-3.5" />
        Kleiner
      </button>

      <span className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1.5 rounded-pill bg-black/55 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm">
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        {playing ? "Tippen zum Anhalten" : "Tippen zum Abspielen"}
      </span>

      {info}
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
                Eine Flex-Spalte mit shrink-0 an der Box hält alles gestapelt. */}
            <div className="flex min-w-0 flex-col gap-4">
              {gif && (
                <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-card bg-muted">
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
                <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
                  {steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}

              {exercise.en && exercise.en !== exercise.name && (
                <p className="text-xs text-muted-foreground">Original: {exercise.en}</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
