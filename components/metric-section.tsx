"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendChart } from "@/components/trend-chart";
import { useMetricData } from "@/lib/use-metric-data";

export function MetricSection({
  metric,
  label,
  unit,
  icon: Icon,
  step = 0.1,
}: {
  metric: string;
  label: string;
  unit: string;
  icon: LucideIcon;
  step?: number;
}) {
  const { entries, loading, addValue } = useMetricData(metric);
  const [input, setInput] = useState("");

  const latest = entries[entries.length - 1];
  const previous = entries[entries.length - 2];
  const delta = latest && previous ? latest.value - previous.value : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(input.replace(",", "."));
    if (Number.isFinite(val) && val > 0) {
      addValue(val);
      setInput("");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
            <Icon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription>
              {latest ? `Zuletzt: ${latest.value} ${unit}` : "Noch keine Einträge"}
            </CardDescription>
          </div>
        </div>
        {delta !== null && (
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {delta > 0 ? (
              <ArrowUp className="size-3" />
            ) : delta < 0 ? (
              <ArrowDown className="size-3" />
            ) : (
              <Minus className="size-3" />
            )}
            {Math.abs(delta).toFixed(1)} {unit}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="h-[220px] animate-pulse rounded-md bg-muted" />
        ) : entries.length > 1 ? (
          <TrendChart entries={entries} />
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            Noch nicht genug Daten für ein Diagramm
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step={step}
            min={0}
            placeholder={`Neuer Wert (${unit})`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="outline">
            Eintragen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
