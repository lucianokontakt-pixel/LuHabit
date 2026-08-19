"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatValue, type DeltaDirection } from "@/components/stat-value";
import { TrendChart } from "@/components/trend-chart";
import { useMetricData } from "@/lib/use-metric-data";
import { formatNumber } from "@/lib/format";
import type { Entry } from "@/lib/api-client";

/** Vergleichswert von vor ~n Tagen. Ohne zweiten Messpunkt gibt es kein Delta. */
function valueDaysAgo(entries: Entry[], days: number): number | null {
  if (entries.length < 2) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const iso = cutoff.toLocaleDateString("sv-SE");
  const older = entries.filter((e) => e.date <= iso);
  if (older.length > 0) return older[older.length - 1].value;
  return entries[0].value;
}

export function MetricSection({
  metric,
  label,
  unit,
  icon: Icon,
  step = 0.1,
  direction = "neutral",
  days = 30,
}: {
  metric: string;
  label: string;
  unit: string;
  icon: LucideIcon;
  step?: number;
  direction?: DeltaDirection;
  days?: number;
}) {
  const { entries, loading, addValue } = useMetricData(metric);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const latest = entries[entries.length - 1];
  const reference = valueDaysAgo(entries, days);
  const delta = latest && reference !== null ? latest.value - reference : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(input.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Bitte eine Zahl größer als 0 eintragen.");
      return;
    }
    setError(null);
    addValue(value);
    setInput("");
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 px-(--card-spacing)">
        <StatValue
          label={label}
          value={latest ? formatNumber(latest.value) : "—"}
          unit={latest ? unit : undefined}
          delta={delta}
          deltaUnit={unit}
          deltaLabel={`in ${days} Tagen`}
          direction={direction}
        />
        <span className="flex size-10 shrink-0 items-center justify-center rounded-tile bg-elevated text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </div>

      <div className="px-(--card-spacing)">
        {loading ? (
          <div className="h-[180px] animate-pulse rounded-panel bg-elevated" />
        ) : entries.length > 1 ? (
          <TrendChart entries={entries} unit={unit} />
        ) : (
          <div className="flex h-[180px] items-center justify-center rounded-panel bg-elevated/60 text-center text-sm text-muted-foreground">
            Noch nicht genug Daten für einen Verlauf —<br />
            trag zwei Werte ein.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 px-(--card-spacing)">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step={step}
            min={0}
            placeholder={`Neuer Wert in ${unit}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={`${label} eintragen`}
          />
          <Button type="submit" size="lg" className="h-11 shrink-0">
            Eintragen
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </Card>
  );
}
