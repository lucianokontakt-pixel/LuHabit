"use client";

import { Weight, Percent } from "lucide-react";
import { MetricSection } from "@/components/metric-section";
import { CalorieCalculator } from "@/components/calorie-calculator";
import { useMetricData } from "@/lib/use-metric-data";

export default function StatsPage() {
  const { entries: weightEntries } = useMetricData("weight");
  const latestWeight = weightEntries[weightEntries.length - 1]?.value;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Körperwerte &amp; Rechner</p>
        <h1 className="text-2xl font-semibold tracking-tight">Personal Stats</h1>
      </div>

      <MetricSection metric="weight" label="Gewicht" unit="kg" icon={Weight} step={0.1} />
      <MetricSection metric="bodyfat" label="Körperfettanteil" unit="%" icon={Percent} step={0.1} />
      <CalorieCalculator latestWeight={latestWeight} />
    </div>
  );
}
