"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { Entry } from "@/lib/api-client";

const chartConfig = {
  value: {
    label: "Wert",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function TrendChart({ entries }: { entries: Entry[] }) {
  const data = entries.map((e) => ({
    date: e.date,
    label: new Date(e.date + "T00:00:00").toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
    value: e.value,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          minTickGap={32}
        />
        <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2.5}
          fill="url(#trendFill)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
