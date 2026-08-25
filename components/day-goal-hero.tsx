"use client";

import { Card } from "@/components/ui/card";

function encouragement(reached: number, total: number): string {
  if (total === 0) return "Leg dein erstes Ziel an.";
  if (reached === 0) return "Noch nichts abgehakt — fang mit dem leichtesten an.";
  if (reached === total) return "Alles geschafft. Stark!";
  const share = reached / total;
  if (share >= 0.75) return "Fast durch — der Rest geht auch noch.";
  if (share >= 0.5) return "Über die Hälfte. Läuft.";
  return "Guter Start, mach weiter.";
}

/**
 * Die einzige farbige Fläche der Seite. Die Style-Referenz erlaubt genau eine
 * Peach-Karte pro Seite — die gehört dem Tagesziel.
 */
export function DayGoalHero({ reached, total }: { reached: number; total: number }) {
  const percent = total > 0 ? Math.round((reached / total) * 100) : 0;

  return (
    <Card variant="blush" className="gap-3">
      <div className="flex flex-col gap-2 px-(--card-spacing) sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="font-display text-3xl leading-none tracking-tight sm:text-heading-sm">
            <span className="nums">{reached}</span>
            <span className="opacity-45"> / {total}</span>
          </p>
          <p className="mt-1.5 text-sm opacity-75">
            {reached === 1 ? "Ziel heute erreicht" : "Zielen heute erreicht"}
          </p>
        </div>
        <p className="text-body leading-snug opacity-90 sm:text-right">
          {encouragement(reached, total)}
        </p>
      </div>

      <div className="px-(--card-spacing)">
        <div className="h-1.5 w-full overflow-hidden rounded-pill bg-current/15">
          <div
            className="h-full rounded-pill bg-current transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
