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
  const blocks = Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), date: d };
  });

  const trainedDays = new Set([...byDate.keys()]);
  const restDaysThisMonth = (() => {
    const cells = monthMatrix(today.getFullYear(), today.getMonth()).filter(
      (c): c is string => c !== null && c <= todayISO
    );
    return cells.filter((c) => !trainedDays.has(c)).length;
  })();

  return (
    <Card className="gap-4">
      <div className="flex items-baseline justify-between px-(--card-spacing)">
        <div>
          <h2 className="text-subheading font-display">Kalender</h2>
          <p className="text-sm text-muted-foreground">
            Trainings- und Ruhetage der letzten {months} Monate
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {restDaysThisMonth} Ruhetage diesen Monat
        </p>
      </div>

      <div className="flex gap-5 overflow-x-auto px-(--card-spacing) pb-1">
        {blocks.map((block) => (
          <div key={`${block.year}-${block.month}`} className="shrink-0">
            <p className="mb-2 text-xs text-muted-foreground">
              {block.date.toLocaleDateString("de-DE", { month: "long" })}
            </p>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_INITIALS.map((initial, i) => (
                <span
                  key={i}
                  className="flex size-6 items-center justify-center text-[10px] text-muted-foreground/60"
                >
                  {initial}
                </span>
              ))}
              {monthMatrix(block.year, block.month).map((date, i) => {
                if (!date) return <span key={`pad-${i}`} className="size-6" />;
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
                      "flex size-6 items-center justify-center rounded-[7px] text-[10px] transition-colors",
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
