"use client";

import { Bar, BarChart, CartesianGrid, XAxis, ReferenceLine } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { dateRange, entriesToMap, monthRange, monthlyTotal } from "@/lib/stats";
import type { Entry } from "@/lib/api-client";

const chartConfig = {
  value: {
    label: "Wert",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function WeeklyChart({
  entries,
  goal,
  days = 7,
  monthly = false,
}: {
  entries: Entry[];
  goal: number;
  days?: number;
  monthly?: boolean;
}) {
  const data = monthly
    ? monthRange(12).map((bucket) => ({
        date: bucket.key,
        label: bucket.label,
        value: monthlyTotal(entries, bucket),
      }))
    : (() => {
        const map = entriesToMap(entries);
        const range = dateRange(days - 1, 0);
        return range.map((date) => {
          const d = new Date(date);
          const label =
            days <= 7 ? WEEKDAY_LABELS[(d.getDay() + 6) % 7] : `${d.getDate()}.${d.getMonth() + 1}.`;
          return { date, label, value: map.get(date) ?? 0 };
        });
      })();

  return (
    <ChartContainer config={chartConfig} className="h-[180px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
        {goal > 0 && !monthly && (
          <ReferenceLine y={goal} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        )}
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
