"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Exercise, WorkoutSession } from "@/lib/training";
import { TINT_FAMILY_LABEL, TINT_FILL, TINTS, tintForMuscles, type Tint } from "@/lib/tints";

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
 *
 * Die Farbe eines Tages ist nicht mehr überall dieselbe, sondern die seiner
 * Muskelfamilie. Damit beantwortet dasselbe Raster eine zweite Frage, für die
 * es vorher eine eigene Ansicht brauchte: nicht nur „wie oft", sondern „wie
 * verteilt" — drei Wochen ohne einen einzigen blauen Tag sieht man sofort.
 */
export function TrainingCalendar({
  sessions,
  exerciseById,
  months = 3,
}: {
  sessions: WorkoutSession[];
  exerciseById: Record<string, Exercise>;
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

  /** Die Tönung je Tag, gezählt über die Sätze — wie überall sonst auch. */
  const tintByDate = new Map<string, Tint>();
  for (const [date, daySessions] of byDate) {
    const muskeln = daySessions
      .flatMap((s) => s.sets.map((set) => exerciseById[set.exerciseId]?.muscle))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
    tintByDate.set(date, tintForMuscles(muskeln));
  }
  /** Nur die Familien zeigen, die im sichtbaren Zeitraum wirklich vorkommen. */
  const vorhandeneTints = TINTS.filter((t) => [...tintByDate.values()].includes(t));

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
                        ? cn(TINT_FILL[tintByDate.get(date) ?? "violet"], "font-medium text-tint-violet-ink")
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

      {/* Die Legende nennt Familien, keine Farben — „Drücken" sagt etwas,
          „Violett" nicht. Und sie zeigt nur, was im Zeitraum vorkommt: eine
          Legende für eine Farbe, die nirgends steht, ist eine Behauptung. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-(--card-spacing) text-[11px] text-muted-foreground">
        {vorhandeneTints.map((tint) => (
          <span key={tint} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-[4px]", TINT_FILL[tint])} />
            {TINT_FAMILY_LABEL[tint]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[4px] bg-elevated" />
          Ruhetag
        </span>
      </div>
    </Card>
  );
}
