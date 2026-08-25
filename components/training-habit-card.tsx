"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid } from "recharts";
import { Flame, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatValue } from "@/components/stat-value";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { useTrainingHabit } from "@/lib/use-training-habit";
import { muscleProgress } from "@/lib/muscle-stats";
import { nextDayFor, type Exercise, type WorkoutPlan, type WorkoutSession } from "@/lib/training";
import type { TrainingHabitSummary } from "@/lib/training-habit";
import { formatCompact, formatNumber, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

const chartConfig = {
  volume: { label: "Volumen", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * Was unter der Kurve steht: die zutreffendste Zeile gewinnt. Heute schon
 * trainiert schlägt alles andere — das ist die frischeste Information.
 * Danach das Wochenziel, dann eine vernachlässigte Muskelgruppe, sonst der
 * nächste geplante Tag.
 */
function footerLine({
  summary,
  sessions,
  exerciseById,
  activePlan,
}: {
  summary: TrainingHabitSummary;
  sessions: WorkoutSession[];
  exerciseById: Record<string, Exercise>;
  activePlan: WorkoutPlan | null;
}): string | null {
  if (summary.trainedToday) {
    const last = sessions[0];
    return last ? `Heute erledigt: ${last.dayName}` : "Heute schon trainiert";
  }

  if (summary.weeklyTarget !== null && summary.thisWeekCount >= summary.weeklyTarget) {
    return `Wochenziel erreicht — ${summary.thisWeekCount} von ${summary.weeklyTarget}`;
  }

  // daysSince ist null, wenn die Muskelgruppe innerhalb des geladenen
  // 91-Tage-Fensters gar nicht vorkommt — das ist nicht "unbekannt", sondern
  // der schlimmste Fall. Ohne diese Sonderbehandlung würde ausgerechnet die
  // am längsten vernachlässigte Gruppe aus der Warnung herausfallen.
  const neglected = muscleProgress(sessions, exerciseById, 12)
    .filter((m) => m.daysSince === null || m.daysSince >= 14)
    .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity))[0];
  if (neglected) {
    return neglected.daysSince !== null
      ? `${neglected.label} seit ${neglected.daysSince} Tagen nicht dran`
      : `${neglected.label} lange nicht trainiert`;
  }

  if (activePlan) {
    const next = nextDayFor(activePlan, sessions[0]);
    if (next) return `Als Nächstes: ${next.name}`;
  }

  return null;
}

export function TrainingHabitCard({
  manageable = false,
  onEdit,
  onDelete,
}: {
  /** Ob der zugrunde liegende Custom-Habit noch existiert und bearbeitbar ist. */
  manageable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { summary, sessions, exerciseById, activePlan, loading, error } = useTrainingHabit();
  const footer = summary ? footerLine({ summary, sessions, exerciseById, activePlan }) : null;

  if (loading) {
    return <div className="h-[240px] animate-pulse rounded-card bg-card" />;
  }

  if (error || !summary) {
    return (
      <Card className="gap-1">
        <p className="px-(--card-spacing) text-sm font-medium">Training konnte nicht geladen werden</p>
        {error && <p className="px-(--card-spacing) text-sm text-muted-foreground">{error}</p>}
      </Card>
    );
  }

  const chartData = summary.weeks.map((w) => ({ label: w.label, volume: Math.round(w.volume) }));
  const target = summary.weeklyTarget;

  return (
    <Link href="/training" className="block">
      <Card className="gap-4 transition-colors hover:bg-elevated">
        <div className="flex items-start justify-between gap-4 px-(--card-spacing)">
          <div>
            <h2 className="font-display text-2xl leading-tight tracking-tight">Training</h2>
            {target !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Diese Woche {summary.thisWeekCount}/{target}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            {target !== null && (
              <div className="flex gap-1.5">
                {Array.from({ length: target }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-2.5 rounded-full",
                      i < summary.thisWeekCount
                        ? "bg-foreground"
                        : "bg-transparent ring-1 ring-inset ring-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
            {manageable && (onEdit || onDelete) && (
              <div className="flex items-center gap-0.5">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Training-Ziel bearbeiten"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Pencil />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Training-Ziel löschen"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-2 px-(--card-spacing)">
          {summary.currentStreak > 0 && <Flame className="size-6 shrink-0 text-muted-foreground" />}
          <p className="nums font-display text-4xl leading-none tracking-tight sm:text-heading">
            {summary.currentStreak}
          </p>
          <p className="text-sm text-muted-foreground">
            {summary.currentStreak === 1 ? "Woche in Folge" : "Wochen in Folge"}
          </p>
        </div>

        <div className="flex flex-col gap-1 px-(--card-spacing)">
          <p className="text-xs text-muted-foreground">Volumen pro Woche</p>
          <ChartContainer config={chartConfig} className="h-[100px] w-full">
            <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="trainingVolumeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-volume)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--color-volume)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--border)" strokeOpacity={1} />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="var(--color-volume)"
                strokeWidth={2}
                fill="url(#trainingVolumeFill)"
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

        <div className="grid grid-cols-3 gap-3 px-(--card-spacing)">
          <StatValue
            label="diese Woche"
            value={String(summary.setsThisWeek)}
            unit="Sätze"
            size="sm"
          />
          <StatValue
            label="Einheiten/Wo"
            value={formatNumber(summary.averageSessionsPerWeek)}
            unit="Ø"
            size="sm"
          />
          <StatValue
            label="Volumen"
            value={formatCompact(Math.round(summary.volumeThisWeek))}
            unit="kg"
            size="sm"
          />
        </div>

        {footer && (
          <p className="border-t border-border/60 px-(--card-spacing) pt-4 text-sm text-muted-foreground">
            {footer}
          </p>
        )}
      </Card>
    </Link>
  );
}
