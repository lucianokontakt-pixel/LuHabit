"use client";

import { stufeVon, type Exercise } from "@/lib/training";
import { cn } from "@/lib/utils";

/**
 * Fünf Striche, von denen so viele gefüllt sind, wie die Übung Stufen hat.
 *
 * Die Stufe sagt, wie üblich eine Übung ist — geschätzt aus Gerät und Name
 * (scripts/exercise-beliebtheit.mjs), überschrieben von dem, was man selbst
 * vergeben hat. Sie steht hier klein und grau neben dem Gerät, nicht als
 * Sterne: Sterne sind schon vergeben (an die Favoriten), und fünf Sterne in
 * jeder Zeile einer tausendzeiligen Liste wären lauter als alles andere darin.
 *
 * Ist ein eigenes Urteil im Spiel, tragen die Striche die Akzentfarbe. So sieht
 * man ohne ein Wort, wo die Automatik steht und wo die eigene Meinung.
 */
export function RankBars({
  exercise,
  className,
}: {
  exercise: Pick<Exercise, "rank" | "rating">;
  className?: string;
}) {
  const stufe = stufeVon(exercise);
  const eigen = exercise.rating !== null;

  return (
    <span
      className={cn("inline-flex shrink-0 items-end gap-[2px]", className)}
      aria-label={`Beliebtheit ${stufe} von 5${eigen ? ", selbst vergeben" : ""}`}
      title={eigen ? `Stufe ${stufe} — selbst vergeben` : `Stufe ${stufe}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          // Ansteigende Höhe: fünf gleich hohe Striche liest man als Zahl und
          // muss zählen, eine Treppe liest man als Menge.
          style={{ height: `${3 + i}px` }}
          className={cn(
            "w-[2px] rounded-[1px]",
            i <= stufe
              ? eigen
                ? "bg-primary"
                : "bg-muted-foreground/60"
              : "bg-muted-foreground/20"
          )}
        />
      ))}
    </span>
  );
}
