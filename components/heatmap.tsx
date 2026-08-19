"use client";

import { cn } from "@/lib/utils";
import { dateRange, entriesToMap } from "@/lib/stats";
import type { Entry } from "@/lib/api-client";

// Dieselbe warme Rampe wie im Trainingskalender.
const LEVEL_CLASSES = [
  "bg-elevated",
  "bg-blush/40",
  "bg-blush/60",
  "bg-blush/80",
  "bg-blush",
];

function levelFor(value: number, goal: number): number {
  if (value <= 0) return 0;
  const ratio = goal > 0 ? value / goal : 1;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 1) return 3;
  return 4;
}

export function Heatmap({
  entries,
  goal,
  weeks = 20,
  unit,
}: {
  entries: Entry[];
  goal: number;
  weeks?: number;
  unit?: string;
}) {
  const map = entriesToMap(entries);
  const totalDays = weeks * 7;
  const days = dateRange(totalDays - 1, 0);

  const first = new Date(days[0]);
  const firstDow = (first.getDay() + 6) % 7; // Montag = 0
  const padded: (string | null)[] = Array(firstDow).fill(null).concat(days);

  const columns: (string | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    columns.push(padded.slice(i, i + 7));
  }

  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((date, di) => {
            if (!date) return <div key={di} className="size-3" />;
            const value = map.get(date) ?? 0;
            const level = levelFor(value, goal);
            return (
              <div
                key={date}
                title={`${date}: ${value}${unit ? " " + unit : ""}`}
                className={cn("size-3 rounded-[3px]", LEVEL_CLASSES[level])}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
