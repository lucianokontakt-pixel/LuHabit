"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MetricEntry } from "@/lib/api-messwerte";
import { tagKurz } from "@/lib/datum";

/** Die Kalendertage eines Fensters, ältester zuerst. */
function dateRange(fromDaysAgo: number, toDaysAgo = 0): string[] {
  const dates: string[] = [];
  for (let i = fromDaysAgo; i >= toDaysAgo; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString("sv-SE"));
  }
  return dates;
}

const chartConfig = {
  value: {
    label: "Wert",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

/**
 * Verlauf einer Messreihe. Zeichnet Achsen und Raster auch dann, wenn noch
 * nichts oder erst ein Wert eingetragen ist — ein leerer Kasten mit Hinweistext
 * verrät nichts darüber, wie die Kurve später aussehen wird. Statt der Linie
 * steht dann nur ein leises Raster mit dem passenden Zeitfenster.
 */
export function TrendChart({
  entries,
  unit,
  emptyDays = 14,
}: {
  entries: MetricEntry[];
  unit?: string;
  /** Breite des Zeitfensters, solange es noch keinen echten Verlauf gibt. */
  emptyDays?: number;
}) {
  const data = useMemo(() => {
    if (entries.length >= 2) {
      return entries.map((e) => ({ date: e.date, label: tagKurz(e.date), value: e.value }));
    }
    // Ohne Verlauf spannt ein fester Zeitraum die Achse auf. Fehlende Tage
    // bleiben null: recharts zeichnet dort nichts, das Raster steht trotzdem.
    const byDate = new Map(entries.map((e) => [e.date, e.value]));
    return dateRange(emptyDays - 1, 0).map((date) => ({
      date,
      label: tagKurz(date),
      value: byDate.get(date) ?? null,
    }));
  }, [entries, emptyDays]);

  const domain = useMemo<[number, number]>(() => {
    const values = data
      .map((d) => d.value)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    if (values.length === 0) return [0, 10];
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Ein einzelner Wert bekommt Luft nach oben und unten, sonst klebt der
    // Punkt auf der Grundlinie.
    const padding = Math.max(1, (max - min) * 0.15);
    return [min - padding, max + padding];
  }, [data]);

  return (
    <ChartContainer config={chartConfig} className="h-[140px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Hauchdünne gestrichelte Gridlines, keine Achsenrahmen. */}
        <CartesianGrid
          vertical={false}
          strokeDasharray="2 4"
          stroke="var(--border)"
          strokeOpacity={1}
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          fontSize={11}
          minTickGap={28}
          stroke="var(--muted-foreground)"
        />
        <YAxis hide domain={domain} />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(v) => `${v}${unit ? ` ${unit}` : ""}`} />}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={{ r: 2.5, fill: "var(--background)", strokeWidth: 1.5 }}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  );
}
