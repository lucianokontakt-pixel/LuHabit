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
import { MUSCLE_TINT, TINT_FILL, TINT_LINE, type Tint } from "@/lib/tints";

/**
 * Höchstens so viele Kurven gleichzeitig — mehr wird zum Knäuel. Die Zahl hing
 * früher an der Länge der Farbliste; seit die Farbe aus der Familie kommt und
 * nicht mehr aus der Reihenfolge, ist sie eine Entscheidung über Lesbarkeit.
 */
const MAX_SELECTED = 5;

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
function Sparkline({ weeks, tint }: { weeks: MuscleProgress["weeks"]; tint: Tint }) {
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
            stroke={TINT_LINE[tint]}
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

  /**
   * Rücken und Bizeps sind dieselbe Familie und damit dieselbe Farbe — als
   * zwei blaue Kurven wären sie nicht auseinanderzuhalten. Das zweite
   * Geschwister bekommt deshalb einen abgesetzten Ton derselben Familie:
   * verwandt genug, dass die Zugehörigkeit sichtbar bleibt, verschieden genug,
   * dass man sie trennt. Der Sprung ist bewusst klein — bei knapp der Hälfte
   * kippte das Blau ins Schwarze und war keine Familie mehr, sondern eine
   * sechste Farbe.
   *
   * Gemischt wird zur Schriftfarbe, nicht zum Hintergrund. Zum Hintergrund
   * hieße im Hellen „blasser" und im Dunkeln „dunkler" — beides genau die
   * Richtung, in der ein zwei Pixel breiter Strich verschwindet. So wird er im
   * Hellen tiefer und im Dunkeln heller, also in beiden Fällen deutlicher.
   *
   * Über die Farbe statt über gestrichelte Linien, weil die Legende nur das
   * Kästchen zeigt: zwei gleiche blaue Kästchen mit verschiedenen Namen wären
   * genau die Verwechslung, die vermieden werden soll.
   */
  const farbeJeMuskel = useMemo(() => {
    const gezaehlt = new Map<Tint, number>();
    const map: Record<string, string> = {};
    for (const muscle of selected) {
      const tint = MUSCLE_TINT[muscle as keyof typeof MUSCLE_TINT];
      const n = gezaehlt.get(tint) ?? 0;
      gezaehlt.set(tint, n + 1);
      map[muscle] =
        n === 0
          ? TINT_LINE[tint]
          : `color-mix(in oklch, ${TINT_LINE[tint]} ${100 - n * 28}%, var(--foreground))`;
    }
    return map;
  }, [selected]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    selected.forEach((muscle) => {
      const entry = progress.find((p) => p.muscle === muscle);
      config[muscle] = { label: entry?.label ?? muscle, color: farbeJeMuskel[muscle] };
    });
    return config;
  }, [selected, progress, farbeJeMuskel]);

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
              {/* Der Familienpunkt wie in der Übungsliste und im Kalender.
                  Nicht die ganze Kachel getönt: zehn Farbflächen nebeneinander
                  wären ein Farbkasten, kein Ordnungsmittel — und die Zahl in
                  der Mitte ist hier die Aussage, nicht die Fläche. */}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-2 shrink-0 rounded-full", TINT_FILL[MUSCLE_TINT[entry.muscle]])} />
                <span className="truncate">{entry.label}</span>
              </p>
              <p className="nums mt-1 text-heading-sm leading-none">
                {formatNumber(entry.averageSets)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">Sätze</span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{basisLabel(entry)}</p>
            </div>

            <Sparkline weeks={entry.weeks} tint={MUSCLE_TINT[entry.muscle]} />

            <div className="flex flex-col gap-1 px-(--card-spacing)">
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
