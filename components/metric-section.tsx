"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatValue, type DeltaDirection } from "@/components/stat-value";
import { TrendChart } from "@/components/trend-chart";
import { useMetricData } from "@/lib/use-metric-data";
import { formatNumber } from "@/lib/format";
import type { Metric, MetricEntry } from "@/lib/api-messwerte";

/** Vergleichswert von vor ~n Tagen. Ohne zweiten Messpunkt gibt es kein Delta. */
function valueDaysAgo(entries: MetricEntry[], days: number): number | null {
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
  metric: Metric;
  label: string;
  unit: string;
  icon: LucideIcon;
  step?: number;
  direction?: DeltaDirection;
  days?: number;
}) {
  const { entries, loading, addValue } = useMetricData(metric);
  const [input, setInput] = useState("");
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = entries[entries.length - 1];
  const reference = valueDaysAgo(entries, days);
  const delta = latest && reference !== null ? latest.value - reference : null;

  // Der zuletzt gemessene Wert steht schon im Feld: eine neue Messung weicht
  // meist nur in der letzten Stelle ab, das spart Tipparbeit am Handy.
  useEffect(() => {
    if (edited || latest === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- übernimmt den geladenen Wert, solange niemand tippt
    setInput(String(latest.value));
  }, [edited, latest]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(input.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Bitte eine Zahl größer als 0 eintragen.");
      return;
    }
    setError(null);
    addValue(value);
    // Zurück auf „unberührt“: das Feld zeigt danach den frisch gespeicherten Wert.
    setEdited(false);
  }

  /** Feinjustierung in Schrittweiten — am Handy schneller als Tippen. */
  function nudge(direction: 1 | -1) {
    const current = Number(input.replace(",", "."));
    const base = Number.isFinite(current) ? current : (latest?.value ?? 0);
    // toFixed fängt Rundungsfehler wie 65,1 − 0,1 = 65,00000000000001 ab.
    const next = Math.max(0, Number((base + direction * step).toFixed(2)));
    setEdited(true);
    setInput(String(next));
    setError(null);
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

      <div className="flex flex-col gap-1 px-(--card-spacing)">
        {loading ? (
          <div className="h-[140px] animate-pulse rounded-panel bg-elevated" />
        ) : (
          <>
            {/* Das Diagramm steht von Anfang an da, auch ohne Werte. Die Achse
                zeigt dann die letzten zwei Wochen — man sieht, wohin die Kurve
                wächst, statt auf einen leeren Kasten zu schauen. */}
            <TrendChart entries={entries} unit={unit} />
            {entries.length < 2 && (
              <p className="text-center text-xs text-muted-foreground">
                {/* Pro Tag zählt nur ein Wert — ein zweiter Eintrag von heute
                    ersetzt den ersten und ergibt noch keinen Verlauf. */}
                {entries.length === 0
                  ? "Noch kein Wert eingetragen — der erste setzt den Startpunkt."
                  : "Ein Messtag steht — ab dem nächsten wird eine Kurve daraus."}
              </p>
            )}
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 px-(--card-spacing)">
        <div className="flex items-center gap-2">
          {/* Minus und Plus rahmen das Feld ein, damit ein Wert ohne Tastatur
              nachjustiert werden kann — die native Spinner-Pfeile entfallen. */}
          <div className="flex min-w-0 flex-1 items-center rounded-pill bg-elevated ring-1 ring-foreground/8 focus-within:ring-2 focus-within:ring-ring/40">
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label={`${label} verringern`}
              className="flex size-11 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:text-foreground"
            >
              <Minus className="size-4" />
            </button>
            {/* type="text" statt "number": die nudge()-Knöpfe schreiben den Wert
                programmatisch ins Feld, während es oft noch den Fokus hält —
                bei type="number" scrollt iOS Safari dabei gelegentlich
                ungefragt, um das Feld "sichtbar" zu halten. Die Zifferntastatur
                kommt weiterhin über inputMode, die Spinner-Pfeile waren ohnehin
                per CSS ausgeblendet. */}
            <Input
              type="text"
              inputMode="decimal"
              placeholder={`Neuer Wert in ${unit}`}
              value={input}
              onChange={(e) => {
                setEdited(true);
                setInput(e.target.value);
              }}
              aria-label={`${label} eintragen`}
              className="border-transparent bg-transparent px-1 text-center focus-visible:border-transparent focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label={`${label} erhöhen`}
              className="flex size-11 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <Button type="submit" size="lg" className="h-11 shrink-0">
            Eintragen
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </Card>
  );
}
