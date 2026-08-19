"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Entry } from "@/lib/api-client";

const chartConfig = {
  value: {
    label: "Wert",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function TrendChart({ entries, unit }: { entries: Entry[]; unit?: string }) {
  const data = entries.map((e) => ({
    date: e.date,
    label: new Date(`${e.date}T00:00:00`).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
    value: e.value,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[180px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* steep: hauchdünne gestrichelte Gridlines, keine Achsenrahmen. */}
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
        <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
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
        />
      </AreaChart>
    </ChartContainer>
  );
}
