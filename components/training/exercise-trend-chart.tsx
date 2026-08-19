"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ProgressPoint } from "@/lib/progression";

const chartConfig = {
  value: { label: "Arbeitsgewicht", color: "var(--chart-1)" },
  oneRm: { label: "1RM (geschätzt)", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Kurve des Arbeitsgewichts (bzw. der Wiederholungen) über die Einheiten. */
export function ExerciseTrendChart({
  points,
  repsBased,
}: {
  points: ProgressPoint[];
  repsBased: boolean;
}) {
  if (points.length < 2) {
    return (
      <p className="rounded-panel bg-elevated/60 px-3 py-4 text-center text-xs text-muted-foreground">
        Eine Einheit reicht noch nicht für eine Kurve — nach der nächsten wird eine daraus.
      </p>
    );
  }

  const unit = repsBased ? "Wdh" : "kg";
  const data = points.map((p) => ({
    label: new Date(`${p.date}T00:00:00`).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
    value: repsBased ? p.topReps : p.topWeight,
    oneRm: repsBased ? null : p.oneRm,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[160px] w-full">
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
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
          width={38}
          stroke="var(--muted-foreground)"
          domain={["dataMin - 2", "dataMax + 2"]}
        />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v} ${unit}`} />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={{ r: 2.5, fill: "var(--background)", strokeWidth: 1.5 }}
          activeDot={{ r: 4 }}
        />
        {!repsBased && (
          <Line
            type="monotone"
            dataKey="oneRm"
            stroke="var(--color-oneRm)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        )}
      </LineChart>
    </ChartContainer>
  );
}
