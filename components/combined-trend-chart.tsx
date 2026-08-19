"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { dateRange, entriesToMap, monthRange, monthlyTotal } from "@/lib/stats";
import type { Entry } from "@/lib/api-client";
import type { HabitConfig } from "@/lib/habits";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const LINE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export type ChartRange = "week" | "month" | "year";

export function CombinedTrendChart({
  order,
  habits,
  goals,
  entries,
  range,
}: {
  order: string[];
  habits: Record<string, HabitConfig>;
  goals: Record<string, number>;
  entries: Entry[];
  range: ChartRange;
}) {
  const config: ChartConfig = {};
  order.forEach((id, i) => {
    config[id] = { label: habits[id]?.label ?? id, color: LINE_COLORS[i % LINE_COLORS.length] };
  });

  let data: Record<string, string | number>[];

  if (range === "year") {
    const buckets = monthRange(12);
    data = buckets.map((bucket) => {
      const point: Record<string, string | number> = { label: bucket.label };
      for (const id of order) {
        const goal = goals[id] || habits[id]?.defaultGoal || 1;
        const habitEntries = entries.filter((e) => e.habit === id);
        const total = monthlyTotal(habitEntries, bucket);
        const target = goal * bucket.days;
        point[id] = target > 0 ? Math.round((total / target) * 100) : 0;
      }
      return point;
    });
  } else {
    const days = range === "week" ? 7 : 30;
    const dates = dateRange(days - 1, 0);
    const maps: Record<string, Map<string, number>> = {};
    for (const id of order) maps[id] = entriesToMap(entries.filter((e) => e.habit === id));

    data = dates.map((date) => {
      const d = new Date(date);
      const label =
        days <= 7 ? WEEKDAY_LABELS[(d.getDay() + 6) % 7] : `${d.getDate()}.${d.getMonth() + 1}.`;
      const point: Record<string, string | number> = { label };
      for (const id of order) {
        const goal = goals[id] || habits[id]?.defaultGoal || 1;
        const value = maps[id].get(date) ?? 0;
        point[id] = goal > 0 ? Math.round((value / goal) * 100) : 0;
      }
      return point;
    });
  }

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          unit="%"
          width={48}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {order.map((id) => (
          <Line
            key={id}
            type="monotone"
            dataKey={id}
            stroke={`var(--color-${id})`}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  );
}
