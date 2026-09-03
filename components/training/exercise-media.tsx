"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dumbbell } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { bildUrl, ladeUebungstext, type Uebungstext } from "@/lib/exercise-catalog";
import {
  EQUIPMENT_LABELS,
  LADEART_LABELS,
  MECHANIK_LABELS,
  MUSCLE_LABELS,
  SCHWIERIGKEIT_LABELS,
  ladeartVon,
  type Exercise,
} from "@/lib/training";
import { cn } from "@/lib/utils";

/** Was `ExerciseThumb` und `ExerciseDetail` von einer Übung brauchen. */
type MitBild = Pick<Exercise, "id" | "name" | "media" | "bilder">;

/**
 * Wie lange eine Position stehen bleibt, bevor die andere kommt.
 *
 * 1,1 Sekunden ist keine Geschmacksfrage: schneller liest man die zwei Bilder
 * als Flackern statt als Bewegung, langsamer wartet man darauf. Das alte GIF
 * lief mit rund einer Sekunde je Wiederholung — dieselbe Größenordnung, nur
 * mit zwei Bildern statt dreißig.
 */
const TAKT = 1100;

/**
 * Das Bild in Listen. Bewusst nur die Startposition: bei 601 Übungen liefen
 * sonst Dutzende Überblendungen gleichzeitig, sobald jemand scrollt.
 *
 * Ausnahme über `animiert`: die eine Übung, die gerade offen ist, darf sich
 * bewegen. Sie wechselt zwischen Start und Umkehrpunkt — die zwei Positionen,
 * die der Datensatz liefert. Wo es nur ein Bild gibt (134 Übungen, meist
 * Ausdauer), bleibt es dabei.
 */
export function ExerciseThumb({
  exercise,
  className,
  animiert = false,
}: {
  exercise: MitBild;
  className?: string;
  animiert?: boolean;
}) {
  const hatZwei = exercise.bilder.length > 1;
  const [peak, setPeak] = useState(false);

  useEffect(() => {
    if (!animiert || !hatZwei) return;
    const timer = setInterval(() => setPeak((v) => !v), TAKT);
    return () => clearInterval(timer);
  }, [animiert, hatZwei]);

  const start = bildUrl(exercise, "start");
  const zweites = hatZwei ? bildUrl(exercise, "peak") : null;

  return (
    <div
      className={cn(
        // bg-elevated, nicht bg-muted: --muted und --card tragen denselben
        // Wert (#f2f2f3), die Fläche wäre in einer Karte also unsichtbar —
        // eine Übung ohne Bild hinterließe dort ein Loch statt eines Platzes.
        "relative size-20 shrink-0 overflow-hidden rounded-md bg-elevated",
        className
      )}
    >
      {start ? (
        <>
          <Image
            src={start}
            alt=""
            fill
            sizes="160px"
            loading="lazy"
            className={cn(
              "object-cover transition-opacity duration-300",
              peak && zweites ? "opacity-0" : "opacity-100"
            )}
            unoptimized
          />
          {zweites && (
            <Image
              src={zweites}
              alt=""
              fill
              sizes="160px"
              loading="lazy"
              className={cn(
                "object-cover transition-opacity duration-300",
                peak ? "opacity-100" : "opacity-0"
              )}
              unoptimized
            />
          )}
        </>
      ) : (
        <Dumbbell className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
}

/**
 * Die Übung in groß, mit allem, was der Datensatz über sie weiß.
 *
 * Diesen Dialog gab es schon einmal — damals enthielt er ein Bild und sonst
 * nichts, hing am Antippen des Vorschaubilds und flog deshalb raus („kein
 * Popup mehr"). Er kommt zurück, weil sich das Verhältnis umgedreht hat: mit
 * RepDB gibt es eine deutsche Anleitung, Tipps und eine Beschreibung zu jeder
 * der 601 Übungen. Und er hängt jetzt an einem eigenen Knopf, nicht am Bild.
 */
export function ExerciseDetail({
  exercise,
  onOpenChange,
}: {
  exercise: Exercise | null;
  onOpenChange: (open: boolean) => void;
}) {
  // Der Text liegt bei der Übungs-ID: sonst stünde nach dem Wechsel für einen
  // Moment die Anleitung der vorigen Übung unter dem neuen Bild.
  const [text, setText] = useState<{ id: string; inhalt: Uebungstext | null } | null>(null);
  const inhalt = text && text.id === exercise?.id ? text.inhalt : null;

  useEffect(() => {
    if (!exercise) return;
    let aktuell = true;
    const id = exercise.id;
    void ladeUebungstext(id).then((geladen) => {
      if (aktuell) setText({ id, inhalt: geladen });
    });
    return () => {
      aktuell = false;
    };
  }, [exercise]);

  if (!exercise) return null;
  const art = ladeartVon(exercise);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-3 overflow-y-auto sm:max-w-md">
        <DialogTitle className="pr-8 text-subheading font-display">{exercise.name}</DialogTitle>

        {/* Beide Positionen nebeneinander statt überblendet: hier ist Platz,
            und wer die Ausführung nachlesen will, vergleicht sie lieber, als
            auf den richtigen Moment zu warten. */}
        <div className="flex gap-2">
          {exercise.bilder.map((bildart) => {
            const src = bildUrl(exercise, bildart);
            if (!src) return null;
            return (
              <div
                key={bildart}
                /* bg-white, nicht bg-muted: die Illustrationen sind selbst weiß
                   hinterlegt, nicht transparent — auf grauem Grund stünde ein
                   sichtbarer Rand um jedes Bild. */
                className="relative aspect-square flex-1 overflow-hidden rounded-panel bg-white"
              >
                <Image
                  src={src}
                  alt={bildart === "peak" ? "Umkehrpunkt" : "Ausgangsposition"}
                  fill
                  sizes="256px"
                  className="object-contain"
                  unoptimized
                />
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          {[
            MUSCLE_LABELS[exercise.muscle],
            EQUIPMENT_LABELS[exercise.equipment],
            art ? LADEART_LABELS[art] : null,
            exercise.mechanik ? MECHANIK_LABELS[exercise.mechanik] : null,
            exercise.schwierigkeit ? SCHWIERIGKEIT_LABELS[exercise.schwierigkeit] : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {inhalt?.beschreibung && <p className="text-sm">{inhalt.beschreibung}</p>}

        {inhalt && inhalt.anleitung.length > 0 && (
          <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-sm text-muted-foreground marker:text-xs">
            {inhalt.anleitung.map((schritt, i) => (
              <li key={i} className="pl-1">
                {schritt}
              </li>
            ))}
          </ol>
        )}

        {inhalt && inhalt.tipps.length > 0 && (
          <div className="rounded-panel bg-elevated p-3">
            <p className="mb-1.5 text-xs font-medium">Worauf es ankommt</p>
            <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground">
              {inhalt.tipps.map((tipp, i) => (
                <li key={i} className="pl-1">
                  {tipp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
