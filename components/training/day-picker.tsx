"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { formatDayLabel } from "@/lib/format";
import { todayISO } from "@/lib/datum";
import { cn } from "@/lib/utils";
import {
  MUSCLE_LABELS,
  type Exercise,
  type Muscle,
  type WorkoutPlan,
  type WorkoutSession,
} from "@/lib/training";

/**
 * Auswahl, welcher Tag des Plans jetzt trainiert wird.
 *
 * Der Vorschlag der Startseite folgt der Reihenfolge im Plan — das passt, bis
 * etwas dazwischenkommt: ein gezerrter Beinbeuger, ein besetztes Gerät, ein
 * kurzer Abend. Dann soll man den Oberkörper trainieren dürfen, ohne den Plan
 * umzubauen.
 *
 * Ein eigener „übersprungen"-Zustand wird bewusst nicht gespeichert. Die
 * Rotation rechnet ab der zuletzt protokollierten Einheit (nextDayFor in
 * lib/training.ts): wer statt Beine Push wählt, bekommt danach Pull
 * vorgeschlagen und Beine in der nächsten Runde wieder. Übersprungen ist also
 * genau das, was Wählen ohnehin schon tut — nur ohne zweiten Merker, der
 * synchronisiert und irgendwann falsch stehen könnte.
 */
export function DayPicker({
  plan,
  sessions,
  exerciseById,
  suggestedId,
  runningId = null,
  open,
  onOpenChange,
}: {
  plan: WorkoutPlan;
  /** Absteigend nach Datum — die erste Einheit je Tag ist die jüngste. */
  sessions: WorkoutSession[];
  exerciseById: Record<string, Exercise>;
  suggestedId: string | null;
  /** Der Tag der angefangenen Einheit, falls gerade eine läuft. */
  runningId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const today = todayISO();
  const days = [...plan.days].sort((a, b) => a.position - b.position);
  const laufenderTag = days.find((d) => d.id === runningId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Welcher Tag?</DialogTitle>
          {/* Läuft schon etwas, ist das Wählen kein harmloser Wechsel mehr: es
              gibt nur einen Entwurf, ein anderer Tag überschreibt ihn. Das
              gehört hierhin, wo entschieden wird — ein Dialog davor wäre eine
              Rückfrage auf eine Rückfrage. */}
          <DialogDescription>
            {laufenderTag
              ? `${laufenderTag.name} ist angefangen. Ein anderer Tag beginnt neu — die angefangene Einheit wird dabei verworfen.`
              : "Der Vorschlag folgt der Reihenfolge im Plan. Du kannst jeden Tag nehmen — der übersprungene kommt in der nächsten Runde wieder."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          {days.map((day) => {
            const muskeln = [
              ...new Set(
                day.exercises
                  .map((pe) => exerciseById[pe.exerciseId]?.muscle)
                  .filter((m): m is Muscle => Boolean(m))
              ),
            ];
            const zuletzt = sessions.find((s) => s.dayId === day.id);
            const anzahl = day.exercises.length;

            // bg-elevated wäre auf der Fläche unsichtbar: im hellen Thema ist es
            // dasselbe Weiß wie der Dialog. foreground/5 hebt sich in beiden
            // Themen ab und macht die Zeile als Ganzes als Ziel erkennbar.
            return (
              <Link
                key={day.id}
                href={`/session?day=${encodeURIComponent(day.id)}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-tile bg-foreground/5 px-3 py-2.5 transition-colors hover:bg-foreground/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{day.name}</span>
                    {/* „Läuft" schlägt „Vorschlag": welcher Tag angefangen ist,
                        wiegt schwerer als welcher an der Reihe wäre. */}
                    {day.id === runningId ? (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-blush px-2 py-0.5 text-[11px] font-normal text-blush-foreground">
                        <span className="size-1.5 animate-pulse rounded-full bg-current" />
                        Läuft
                      </span>
                    ) : (
                      day.id === suggestedId && (
                        <span className="shrink-0 rounded-pill bg-foreground/8 px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                          Vorschlag
                        </span>
                      )
                    )}
                  </p>
                  {/* Die Muskeln stehen vor der Übungszahl: wer wegen einer
                      Verletzung wählt, sucht genau danach. */}
                  <p className="truncate text-xs text-muted-foreground">
                    {muskeln.length > 0
                      ? muskeln.map((m) => MUSCLE_LABELS[m]).join(", ")
                      : "Noch keine Übungen"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground/70">
                    {anzahl} {anzahl === 1 ? "Übung" : "Übungen"} ·{" "}
                    {zuletzt
                      ? `zuletzt ${formatDayLabel(zuletzt.date, today)}`
                      : "noch nie trainiert"}
                  </p>
                </div>
                <Play className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        <Link
          href="/plaene"
          onClick={() => onOpenChange(false)}
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Anderen Plan wählen
        </Link>
      </DialogContent>
    </Dialog>
  );
}
