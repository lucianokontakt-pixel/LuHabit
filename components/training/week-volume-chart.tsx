"use client";

import { Area, AreaChart, CartesianGrid } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  volume: { label: "Volumen", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * Die Volumenkurve der Wochenkarte — als eigene Datei, damit recharts nicht
 * auf der Startseite landet.
 *
 * Die Bibliothek wiegt 106 KB gepackt (376 KB, die der Browser durchkauen
 * muss) und wurde bisher auf jedem Aufruf der Startseite mitgeladen — für eine
 * Kurve, die erst ab drei Wochen mit Volumen überhaupt erscheint. Wer gerade
 * anfängt, zahlte also den vollen Preis für etwas, das er nie zu sehen bekam.
 * Nachgeladen wird jetzt erst, wenn die Karte die Kurve wirklich zeigt.
 */
export function WeekVolumeChart({ data }: { data: { label: string; volume: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[90px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
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
  );
}
