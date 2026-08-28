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
/**
 * Ab so vielen Trainingstagen ergibt das Raster ein Muster. Darunter ist es ein
 * Feld aus leeren Kästchen mit einem Punkt darin — und der Kalender weiter
 * unten sagt dasselbe, nur in lesbaren Daten.
 */
const MIN_TRAININGSTAGE = 6;

/** So viele Wochen bleiben stehen, auch wenn nur die letzte etwas enthält. */
const MIN_WOCHEN = 12;

export function TrainingHeatmap({ sessions }: { sessions: WorkoutSession[] }) {
  const router = useRouter();

  const days = useMemo(() => heatmapDays(sessions, 365), [sessions]);

  /**
   * Spalten sind Wochen, Zeilen Wochentage — Montag oben.
   *
   * Vorne fallen die Wochen weg, in denen es nichts zu sehen gab. Ein festes
   * Jahr hieß bei drei Monaten Verlauf, dass drei Viertel der Karte leer sind,
   * und leere Fläche liest sich wie ein Fehler, nicht wie eine Pause. Zwölf
   * Wochen bleiben in jedem Fall stehen, sonst schrumpfte das Raster bei einer
   * frischen Woche auf eine einzelne Spalte.
   */
  const weeks = useMemo(() => {
    const alle: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) alle.push(days.slice(i, i + 7));
    const spaeteste = Math.max(0, alle.length - MIN_WOCHEN);
    const erste = alle.findIndex((week) => week.some((day) => day.sets > 0));
    return alle.slice(erste < 0 ? spaeteste : Math.min(erste, spaeteste));
  }, [days]);

  const gezeigt = useMemo(() => weeks.flat(), [weeks]);

  // Ein Monatsname über der ersten Woche, in der er beginnt. Sonst stünde über
  // jeder zweiten Spalte derselbe Name.
  const labels = weeks.map((week, i) => {
    const month = Number(week[0].date.slice(5, 7)) - 1;
    const previous = i > 0 ? Number(weeks[i - 1][0].date.slice(5, 7)) - 1 : -1;
    return month !== previous ? MONTHS[month] : "";
  });

  const trainedDays = gezeigt.filter((d) => d.sets > 0).length;

  // Ans rechte Ende springen: die laufende Woche ist die, die interessiert.
  // Zwölf Monate passen auf kein Telefon, also entscheidet der Startpunkt, was
  // man überhaupt zu sehen bekommt.
  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = stripRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [weeks]);

  // Erst wenn das Raster etwas zu rastern hat.
  if (trainedDays < MIN_TRAININGSTAGE) return null;

  /**
   * Die Legende erklärt eine Skala. Kommen keine drei Stufen vor, erklärt sie
   * nichts — dann sind fünf Kästchen unter der Karte nur eine weitere Zeile,
   * die gelesen werden will.
   */
  const stufen = new Set(gezeigt.filter((d) => d.level > 0).map((d) => d.level));

  const monate = Math.max(1, Math.round(weeks.length / 4.345));

  return (
    <Card className="gap-4">
      <div className="flex items-baseline justify-between gap-3 px-(--card-spacing)">
        <div>
          <h2 className="text-subheading font-display">Aktivität</h2>
          <p className="text-sm text-muted-foreground">
            {monate === 1 ? "Letzter Monat" : `Letzte ${monate} Monate`}, nach Sätzen pro Tag
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
                    onClick={() => router.push(`/einheit/${day.sessionIds[0]}`)}
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

      {stufen.size >= 3 && (
        <div className="flex items-center gap-1.5 px-(--card-spacing) text-[11px] text-muted-foreground">
          Weniger
          {LEVEL_CLASSES.map((cls, i) => (
            <span key={i} className={cn("size-3 rounded-[3px]", cls)} />
          ))}
          Mehr
        </div>
      )}
    </Card>
  );
}
