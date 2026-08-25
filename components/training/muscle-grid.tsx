"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card } from "@/components/ui/card";
import {
  WEEKLY_SETS_MAX,
  WEEKLY_SETS_MIN,
  type MuscleProgress,
  type MuscleStatus,
} from "@/lib/muscle-stats";
import { formatCompact, formatNumber, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

const LINE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Höchstens so viele Kurven gleichzeitig — sonst wiederholen sich die Farben. */
const MAX_SELECTED = LINE_COLORS.length;

const STATUS_LABELS: Record<MuscleStatus, string> = {
  none: "kein Reiz",
  low: "unter dem Korridor",
  good: "im Korridor",
  high: "über dem Korridor",
};

/** Woraus die große Zahl gerechnet ist — steht als Fußnote unter der Kachel. */
function basisLabel(entry: MuscleProgress): string {
  return entry.basis === "average" ? "Schnitt pro Woche" : "diese Woche bisher";
}

/**
 * Kleiner Verlauf je Muskelgruppe. Zeichnet die Linie auch dann, wenn nichts
 * eingetragen ist — eine leere Fläche sagt weniger als eine Linie, die flach
 * auf null liegt.
 */
function Sparkline({ weeks }: { weeks: MuscleProgress["weeks"] }) {
  const max = Math.max(WEEKLY_SETS_MAX + 4, ...weeks.map((w) => w.sets));

  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={weeks} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          {/* Der Zielkorridor als ruhige Bank hinter der Kurve. */}
          <ReferenceArea
            y1={WEEKLY_SETS_MIN}
            y2={WEEKLY_SETS_MAX}
            fill="var(--foreground)"
            fillOpacity={0.06}
            stroke="none"
          />
          <XAxis dataKey="label" hide />
          <YAxis hide domain={[0, max]} />
          <Line
            type="monotone"
            dataKey="sets"
            stroke="var(--chart-1)"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MuscleGrid({ progress }: { progress: MuscleProgress[] }) {
  // Voreinstellung: die fünf Gruppen mit den meisten Sätzen — dort ist am
  // ehesten etwas zu sehen. Ohne jeden Verlauf einfach die ersten fünf.
  const [selected, setSelected] = useState<string[]>(() =>
    [...progress]
      .sort((a, b) => b.totalSets - a.totalSets)
      .slice(0, MAX_SELECTED)
      .map((p) => p.muscle)
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    selected.forEach((muscle, i) => {
      const entry = progress.find((p) => p.muscle === muscle);
      config[muscle] = { label: entry?.label ?? muscle, color: LINE_COLORS[i % LINE_COLORS.length] };
    });
    return config;
  }, [selected, progress]);

  const chartData = useMemo(() => {
    const weeks = progress[0]?.weeks ?? [];
    return weeks.map((week, index) => {
      const point: Record<string, string | number> = { label: week.label };
      for (const muscle of selected) {
        point[muscle] = progress.find((p) => p.muscle === muscle)?.weeks[index]?.sets ?? 0;
      }
      return point;
    });
  }, [progress, selected]);

  function toggle(muscle: string) {
    setSelected((prev) => {
      if (prev.includes(muscle)) return prev.filter((m) => m !== muscle);
      // Die älteste Auswahl weicht, statt den Klick wirkungslos verpuffen zu lassen.
      return [...prev, muscle].slice(-MAX_SELECTED);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-(--card-spacing)">
          <div>
            <h2 className="text-subheading font-display">Sätze pro Woche</h2>
            <p className="text-sm text-muted-foreground">
              Letzte {progress[0]?.weeks.length ?? 12} Wochen im Vergleich
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Korridor {WEEKLY_SETS_MIN}–{WEEKLY_SETS_MAX} Sätze
          </p>
        </div>

        <div className="px-(--card-spacing)">
          <ChartContainer config={chartConfig} className="h-[190px] w-full">
            <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <ReferenceArea
                y1={WEEKLY_SETS_MIN}
                y2={WEEKLY_SETS_MAX}
                fill="var(--foreground)"
                fillOpacity={0.05}
                stroke="none"
              />
              <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                fontSize={11}
                minTickGap={24}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                width={34}
                allowDecimals={false}
                domain={[0, (max: number) => Math.max(WEEKLY_SETS_MAX + 4, max + 2)]}
                stroke="var(--muted-foreground)"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {selected.map((muscle) => (
                <Line
                  key={muscle}
                  type="monotone"
                  dataKey={muscle}
                  stroke={`var(--color-${muscle})`}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "var(--background)", strokeWidth: 1.5 }}
                  activeDot={{ r: 4 }}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-(--card-spacing)">
          {progress.map((entry) => (
            <button
              key={entry.muscle}
              type="button"
              onClick={() => toggle(entry.muscle)}
              aria-pressed={selected.includes(entry.muscle)}
              className={cn(
                "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
                selected.includes(entry.muscle)
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated text-muted-foreground hover:text-foreground"
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {progress.map((entry) => (
          <Card key={entry.muscle} size="sm" className="gap-2">
            <div className="px-(--card-spacing)">
              <p className="truncate text-xs text-muted-foreground">{entry.label}</p>
              <p className="nums mt-1 text-heading-sm leading-none">
                {formatNumber(entry.averageSets)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">Sätze</span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{basisLabel(entry)}</p>
            </div>

            <Sparkline weeks={entry.weeks} />

            <div className="flex flex-col gap-1 px-(--card-spacing)">
              {/* Kein Peach hier: die eine Farbfläche der Seite gehört nicht
                  zehn Kacheln gleichzeitig. */}
              <span
                className={cn(
                  "w-fit rounded-pill bg-elevated px-2 py-0.5 text-[10px]",
                  entry.status === "good" ? "text-success" : "text-muted-foreground"
                )}
              >
                {STATUS_LABELS[entry.status]}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {entry.daysSince === null
                  ? "noch nie trainiert"
                  : entry.daysSince === 0
                    ? "heute trainiert"
                    : `zuletzt vor ${entry.daysSince} ${entry.daysSince === 1 ? "Tag" : "Tagen"}`}
              </p>
              <p className="nums text-[11px] text-muted-foreground">
                {formatCompact(Math.round(entry.volume))} kg
                {entry.oneRmChange !== null && entry.oneRmChange !== 0
                  ? ` · 1RM ${formatSigned(entry.oneRmChange, 1)} kg`
                  : ""}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
