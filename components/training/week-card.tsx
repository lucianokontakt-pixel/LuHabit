"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid } from "recharts";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { trainingHabitSummary } from "@/lib/training-habit";
import { muscleProgress } from "@/lib/muscle-stats";
import type { Exercise, WorkoutSession } from "@/lib/training";
import { StatValue } from "@/components/stat-value";
import { formatCompact, formatNumber, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

const chartConfig = {
  volume: { label: "Volumen", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Ab wann eine Muskelgruppe als vernachlässigt gilt. */
const NEGLECTED_DAYS = 14;

/**
 * Wie die Woche läuft: das Wochenziel, die Serie und die Volumenkurve.
 *
 * Alles drei in einer Karte, weil es dieselbe Frage beantwortet — drei Karten
 * nebeneinander hätten dreimal denselben Rahmen für einen Gedanken.
 */
export function WeekCard({
  sessions,
  exerciseById,
  weeklyTarget,
  weights,
}: {
  sessions: WorkoutSession[];
  exerciseById: Record<string, Exercise>;
  weeklyTarget: number | null;
  weights: { date: string; value: number }[];
}) {
  const summary = useMemo(
    () => trainingHabitSummary(sessions, exerciseById, weeklyTarget, 12, new Date(), weights),
    [sessions, exerciseById, weeklyTarget, weights]
  );

  /**
   * Die am längsten liegengebliebene Muskelgruppe. `daysSince === null` heißt
   * nicht „unbekannt", sondern „im ganzen Fenster nicht vorgekommen" — das ist
   * der schlimmste Fall und darf nicht durch die Prüfung fallen.
   */
  const neglected = useMemo(() => {
    if (sessions.length === 0) return null;
    return (
      muscleProgress(sessions, exerciseById, 12)
        .filter((m) => m.daysSince === null || m.daysSince >= NEGLECTED_DAYS)
        .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity))[0] ?? null
    );
  }, [sessions, exerciseById]);

  const chartData = summary.weeks.map((w) => ({
    label: w.label,
    volume: Math.round(w.volume),
  }));
  const hasVolume = chartData.some((d) => d.volume > 0);

  return (
    <Card className="gap-4">
      <div className="flex items-baseline justify-between gap-3 px-(--card-spacing)">
        <div>
          <p className="text-xs text-muted-foreground">Diese Woche</p>
          <p className="nums mt-1 text-heading-sm leading-none">
            {summary.thisWeekCount}
            {weeklyTarget !== null && (
              <span className="text-muted-foreground"> / {weeklyTarget}</span>
            )}
            {weeklyTarget === null && (
              <span className="ml-1 text-sm text-muted-foreground">
                {summary.thisWeekCount === 1 ? "Einheit" : "Einheiten"}
              </span>
            )}
          </p>
        </div>

        {summary.currentStreak > 0 && (
          <p className="flex shrink-0 items-baseline gap-1.5 text-sm text-muted-foreground">
            <Flame className="size-4 shrink-0 translate-y-0.5" />
            <span className="nums text-foreground">{summary.currentStreak}</span>
            {summary.currentStreak === 1 ? "Woche in Folge" : "Wochen in Folge"}
          </p>
        )}
      </div>

      {weeklyTarget !== null && (
        <div className="flex gap-1.5 px-(--card-spacing)">
          {Array.from({ length: weeklyTarget }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-pill transition-colors",
                i < summary.thisWeekCount ? "bg-chart-1" : "bg-elevated"
              )}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 px-(--card-spacing)">
        <StatValue label="Sätze" value={String(summary.setsThisWeek)} size="sm" />
        <StatValue
          label="Volumen"
          value={formatCompact(Math.round(summary.volumeThisWeek))}
          unit="kg"
          size="sm"
        />
        <StatValue
          label="Ø pro Woche"
          value={formatNumber(summary.averageSessionsPerWeek)}
          unit="Einheiten"
          size="sm"
        />
      </div>

      {hasVolume && (
        <div className="flex flex-col gap-1 px-(--card-spacing)">
          <p className="text-xs text-muted-foreground">Volumen pro Woche</p>
          <ChartContainer config={chartConfig} className="h-[90px] w-full">
            <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="weekVolumeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-volume)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--color-volume)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="2 4"
                stroke="var(--border)"
                strokeOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="var(--color-volume)"
                strokeWidth={2}
                fill="url(#weekVolumeFill)"
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
          <p className="text-[11px] text-muted-foreground">
            {summary.weeks.length} Wochen
            {summary.volumeDeltaPercent !== null &&
              ` · ${formatSigned(summary.volumeDeltaPercent)} % zur Vorwoche`}
          </p>
        </div>
      )}

      {/* Der eine Hinweis, den sonst niemand gibt: was liegen geblieben ist.
          Was als Nächstes dransteht, sagt die Karte darüber schon. */}
      {neglected && (
        <p className="border-t border-border/60 px-(--card-spacing) pt-4 text-sm text-muted-foreground">
          {neglected.daysSince !== null
            ? `${neglected.label} seit ${neglected.daysSince} Tagen nicht dran`
            : `${neglected.label} lange nicht trainiert`}
        </p>
      )}
    </Card>
  );
}
