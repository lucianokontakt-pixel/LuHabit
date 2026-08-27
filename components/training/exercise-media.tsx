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
 * Die Bewegung während der Einheit.
 *
 * Standard ist kompakt: ein 112er-Quadrat links, daneben das, was sonst
 * darunter stand. Das Quadrat über die volle Breite fraß auf einem 390er-Handy
 * rund 60 Prozent des Bildschirms — viel Platz für etwas, das beim Training nur
 * zur Orientierung dient, und die Zeile daneben blieb dabei leer.
 *
 * Wer die Bewegung wirklich ansehen will, macht sie groß; dort hält ein Tippen
 * sie an, denn beim Nachmachen will man den Endpunkt sehen, nicht die Schleife.
 * Die Wahl bleibt über Übungen und Einheiten hinweg gespeichert.
 */
export function ExerciseMedia({
  exercise,
  onOpenDetail,
  children,
}: {
  exercise: Pick<Exercise, "id" | "name" | "media" | "muscle" | "equipment">;
  onOpenDetail?: () => void;
  /** Die Zeilen neben (kompakt) bzw. unter (groß) der Bewegung. */
  children?: React.ReactNode;
}) {
  const [playing, setPlaying] = useState(true);
  const [big, setBig] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- liest die Einstellung einmalig beim Mount
      if (localStorage.getItem(SIZE_KEY) === "gross") setBig(true);
    } catch {
      // Kein Speicher, kein Problem — dann bleibt es bei kompakt.
    }
  }, []);

  const toggleSize = () => {
    setBig((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIZE_KEY, next ? "gross" : "kompakt");
      } catch {
        // Gilt dann nur für diese Sitzung.
      }
      return next;
    });
  };

  const gif = gifUrl(exercise);
  const still = imageUrl(exercise);
  if (!gif || !still) return <>{children}</>;

  const detailButton = onOpenDetail && (
    <button
      type="button"
      onClick={onOpenDetail}
      aria-label={`${exercise.name} — Anleitung`}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        big
          ? "absolute top-2 right-2 bg-black/55 text-white backdrop-blur-sm"
          : "text-muted-foreground"
      )}
    >
      <Info className="size-4" />
    </button>
  );

  if (!big) {
    return (
      <div className="mx-(--card-spacing) flex items-start gap-3">
        {/* Das Bild ist zugleich der Schalter: „größer" ist die einzige Sache,
            die man hier von ihm will. */}
        <button
          type="button"
          onClick={toggleSize}
          aria-label={`${exercise.name} größer zeigen`}
          className="relative size-28 shrink-0 overflow-hidden rounded-card bg-white"
        >
          <Image
            src={gif}
            alt={`Bewegungsablauf: ${exercise.name}`}
            fill
            sizes="112px"
            className="object-contain"
            unoptimized
          />
          <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <Maximize2 className="size-3" />
          </span>
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5 text-xs text-muted-foreground">
          <p className="truncate">
            {MUSCLE_LABELS[exercise.muscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
          </p>
          {children}
        </div>

        {detailButton}
      </div>
    );
  }

  return (
    <>
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

        {detailButton}
      </div>

      {children && (
        <div className="mx-(--card-spacing) flex flex-col gap-1 text-xs text-muted-foreground">
          {children}
        </div>
      )}
    </>
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
