"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WorkoutSession } from "@/lib/training";

const WEEKDAY_INITIALS = ["M", "D", "M", "D", "F", "S", "S"];

function monthMatrix(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Montag = 0
  const cells: (string | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day).toLocaleDateString("sv-SE"));
  }
  return cells;
}

/**
 * Monatsraster: trainierte Tage tragen die Farbe, Ruhetage bleiben leer —
 * so sieht man Frequenz und Pausen im selben Bild.
 */
export function TrainingCalendar({
  sessions,
  months = 3,
}: {
  sessions: WorkoutSession[];
  months?: number;
}) {
  const byDate = new Map<string, WorkoutSession[]>();
  for (const session of sessions) {
    const list = byDate.get(session.date) ?? [];
    list.push(session);
    byDate.set(session.date, list);
  }

  const today = new Date();
  const todayISO = today.toLocaleDateString("sv-SE");
  const trainedDays = new Set([...byDate.keys()]);

  /**
   * Nur die Monate, in denen es etwas zu sehen gibt. Bis hierher standen immer
   * drei Raster nebeneinander — bei einem Trainingstag im August also Juni und
   * Juli als leere Kachelfelder daneben, zwei Drittel der Karte für die Aussage
   * „hier war nichts". Der laufende Monat bleibt in jedem Fall stehen, sonst
   * hätte die Karte an einem Tag ohne jeden Verlauf gar keinen Inhalt.
   */
  const ersterTag = [...trainedDays].sort()[0] ?? null;
  const blocks = Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), date: d };
  }).filter((block) => {
    const laufend = block.month === today.getMonth() && block.year === today.getFullYear();
    if (laufend || !ersterTag) return laufend;
    const monatsende = new Date(block.year, block.month + 1, 0).toLocaleDateString("sv-SE");
    return monatsende >= ersterTag;
  });
  const restDaysThisMonth = (() => {
    const cells = monthMatrix(today.getFullYear(), today.getMonth()).filter(
      (c): c is string => c !== null && c <= todayISO
    );
    return cells.filter((c) => !trainedDays.has(c)).length;
  })();

  const einzeln = blocks.length === 1;

  return (
    <Card className="gap-4">
      {/* Beides in einer Zeile statt Titel links und Zahl rechts: der Satz
          rechts klemmte die Beschreibung in eine schmale Spalte, in der sie auf
          drei Zeilen umbrach. Und „Ruhetage" stand dabei zweimal da. */}
      <div className="px-(--card-spacing)">
        <h2 className="text-subheading font-display">Kalender</h2>
        <p className="text-sm text-muted-foreground">
          {blocks.length === 1 ? "Dieser Monat" : `Letzte ${blocks.length} Monate`} ·{" "}
          {restDaysThisMonth} {restDaysThisMonth === 1 ? "Ruhetag" : "Ruhetage"}
          {blocks.length > 1 && " diesen Monat"}
        </p>
      </div>

      {/* Ein einzelner Monat nimmt die Breite, die da ist, statt als schmales
          24px-Raster links in einer breiten Karte zu kleben. Nach oben
          begrenzt, sonst würden aus sieben Spalten auf dem Desktop sieben
          Kacheln von 120px. Erst ab zwei Monaten stehen sie wieder
          nebeneinander und die Reihe scrollt. */}
      <div
        className={cn(
          "px-(--card-spacing)",
          einzeln ? "" : "flex gap-5 overflow-x-auto pb-1"
        )}
      >
        {blocks.map((block) => (
          <div
            key={`${block.year}-${block.month}`}
            className={einzeln ? "w-full max-w-[22rem]" : "shrink-0"}
          >
            {/* Bei einem einzelnen Monat stünde hier „August", während die
                Zeile über der Karte schon „Dieser Monat" sagt. Der Name ist
                nur nötig, wo mehrere nebeneinander stehen. */}
            {!einzeln && (
              <p className="mb-2 text-xs text-muted-foreground">
                {block.date.toLocaleDateString("de-DE", { month: "long" })}
              </p>
            )}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_INITIALS.map((initial, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex items-center justify-center text-muted-foreground/60",
                    einzeln ? "h-6 text-[11px]" : "size-6 text-[10px]"
                  )}
                >
                  {initial}
                </span>
              ))}
              {monthMatrix(block.year, block.month).map((date, i) => {
                if (!date)
                  return (
                    <span key={`pad-${i}`} className={einzeln ? "aspect-square" : "size-6"} />
                  );
                const daySessions = byDate.get(date);
                const isFuture = date > todayISO;
                const isToday = date === todayISO;
                return (
                  <span
                    key={date}
                    title={
                      daySessions
                        ? `${date}: ${daySessions.map((s) => s.dayName).join(", ")}`
                        : `${date}: Ruhetag`
                    }
                    className={cn(
                      "flex items-center justify-center rounded-[7px] transition-colors",
                      einzeln ? "aspect-square text-xs" : "size-6 text-[10px]",
                      daySessions
                        ? "bg-blush font-medium text-blush-foreground"
                        : isFuture
                          ? "text-muted-foreground/25"
                          : "bg-elevated text-muted-foreground/60",
                      isToday && "ring-1 ring-foreground/40"
                    )}
                  >
                    {Number(date.slice(-2))}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 px-(--card-spacing) text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[4px] bg-blush" />
          Training
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[4px] bg-elevated" />
          Ruhetag
        </span>
      </div>
    </Card>
  );
}
