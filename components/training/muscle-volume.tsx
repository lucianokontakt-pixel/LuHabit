"use client";

import { Card } from "@/components/ui/card";
import { MUSCLES, type Muscle } from "@/lib/training";
import { formatCompact } from "@/lib/format";

/**
 * Volumen (kg × Wdh.) je Muskelgruppe als Balkenliste — zeigt auf einen Blick,
 * welche Gruppe im Zeitraum zu kurz kommt.
 */
export function MuscleVolume({
  volumeByMuscle,
  rangeLabel,
}: {
  volumeByMuscle: Record<Muscle, number>;
  rangeLabel: string;
}) {
  const rows = MUSCLES.map((m) => ({ ...m, volume: volumeByMuscle[m.key] ?? 0 })).sort(
    (a, b) => b.volume - a.volume
  );
  const max = Math.max(...rows.map((r) => r.volume), 1);
  const total = rows.reduce((sum, r) => sum + r.volume, 0);

  return (
    <Card className="gap-4">
      <div className="flex items-baseline justify-between px-(--card-spacing)">
        <div>
          <h2 className="text-subheading font-display">Volumen pro Muskelgruppe</h2>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <p className="nums shrink-0 text-body-lg">{formatCompact(Math.round(total))} kg</p>
      </div>

      {total === 0 ? (
        <p className="px-(--card-spacing) text-sm text-muted-foreground">
          In diesem Zeitraum wurde noch nichts protokolliert.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 px-(--card-spacing)">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">
                {row.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-pill bg-elevated">
                <div
                  className="h-full rounded-pill bg-chart-1 transition-[width] duration-500"
                  style={{ width: `${(row.volume / max) * 100}%` }}
                />
              </div>
              <span className="nums w-16 shrink-0 text-right text-xs text-muted-foreground">
                {formatCompact(Math.round(row.volume))}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
