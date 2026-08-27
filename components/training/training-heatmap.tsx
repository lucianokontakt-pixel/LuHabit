"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { heatmapDays } from "@/lib/training-heatmap";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WorkoutSession } from "@/lib/training";

/**
 * Achromatisch statt in Peach: der Kalender darunter trägt schon die eine
 * Farbfläche der Seite, und zwei warme Raster nebeneinander konkurrieren
 * miteinander, statt sich zu ergänzen.
 */
const LEVEL_CLASSES = [
  "bg-elevated",
  "bg-foreground/15",
  "bg-foreground/32",
  "bg-foreground/55",
  "bg-foreground/85",
];

const MONTHS = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

/**
 * Ein Jahr Training auf einen Blick: ein Feld je Tag, je dunkler desto mehr
 * Sätze.
 *
 * Sätze und nicht Volumen oder Dauer. Volumen sagt nichts über den Tag aus —
 * 100 kg Beinpresse gegen 10 kg Seitheben —, und die Dauer fehlt bei jeder
 * nachgetragenen Einheit. Sätze stehen immer da und sind vergleichbar.
 */
export function TrainingHeatmap({ sessions }: { sessions: WorkoutSession[] }) {
  const router = useRouter();
  const days = useMemo(() => heatmapDays(sessions, 365), [sessions]);

  // Spalten sind Wochen, Zeilen Wochentage — Montag oben.
  const weeks = useMemo(() => {
    const out: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [days]);

  // Ein Monatsname über der ersten Woche, in der er beginnt. Sonst stünde über
  // jeder zweiten Spalte derselbe Name.
  const labels = weeks.map((week, i) => {
    const month = Number(week[0].date.slice(5, 7)) - 1;
    const previous = i > 0 ? Number(weeks[i - 1][0].date.slice(5, 7)) - 1 : -1;
    return month !== previous ? MONTHS[month] : "";
  });

  const trainedDays = days.filter((d) => d.sets > 0).length;

  // Ans rechte Ende springen: die laufende Woche ist die, die interessiert.
  // Zwölf Monate passen auf kein Telefon, also entscheidet der Startpunkt, was
  // man überhaupt zu sehen bekommt.
  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = stripRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [weeks]);

  return (
    <Card className="gap-4">
      <div className="flex items-baseline justify-between gap-3 px-(--card-spacing)">
        <div>
          <h2 className="text-subheading font-display">Aktivität</h2>
          <p className="text-sm text-muted-foreground">
            Letzte 12 Monate, nach Sätzen pro Tag
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {trainedDays} {trainedDays === 1 ? "Trainingstag" : "Trainingstage"}
        </p>
      </div>

      <div ref={stripRef} className="overflow-x-auto px-(--card-spacing) pb-1">
        <div className="flex w-max gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={week[0].date} className="flex flex-col gap-[3px]">
              <span className="h-3 text-[9px] leading-3 text-muted-foreground">
                {labels[wi]}
              </span>
              {week.map((day) => {
                const trained = day.sessionIds.length > 0;
                const title = trained
                  ? `${formatDateLong(day.date)}: ${day.sets} ${day.sets === 1 ? "Satz" : "Sätze"}`
                  : `${formatDateLong(day.date)}: kein Training`;
                return (
                  <button
                    key={day.date}
                    type="button"
                    title={title}
                    aria-label={title}
                    disabled={!trained}
                    onClick={() => router.push(`/training/einheit/${day.sessionIds[0]}`)}
                    className={cn(
                      "size-3 rounded-[3px]",
                      LEVEL_CLASSES[day.level],
                      trained && "cursor-pointer"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-(--card-spacing) text-[11px] text-muted-foreground">
        Weniger
        {LEVEL_CLASSES.map((cls, i) => (
          <span key={i} className={cn("size-3 rounded-[3px]", cls)} />
        ))}
        Mehr
      </div>
    </Card>
  );
}
