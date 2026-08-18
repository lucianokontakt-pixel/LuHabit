"use client";

import { useEffect, useState } from "react";
import { X, CalendarRange } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HabitConfig } from "@/lib/habits";
import { getPreviousWeekRange } from "@/lib/weekly-review";
import type { Entry } from "@/lib/api-client";

const STORAGE_KEY = "luhabit-weekly-review-dismissed";

export function WeeklyReview({
  order,
  habits,
  goals,
  entries,
}: {
  order: string[];
  habits: Record<string, HabitConfig>;
  goals: Record<string, number>;
  entries: Entry[];
}) {
  const [dismissed, setDismissed] = useState(true);
  const { from, to, weekKey } = getPreviousWeekRange();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prüft einmalig beim Mount, ob diese Woche schon geschlossen wurde
      setDismissed(stored === weekKey);
    } catch {
      setDismissed(false);
    }
  }, [weekKey]);

  const rows = order
    .map((id) => habits[id])
    .filter(Boolean)
    .map((config) => {
      const weekEntries = entries.filter(
        (e) => e.habit === config.type && e.date >= from && e.date <= to
      );
      const total = weekEntries.reduce((sum, e) => sum + e.value, 0);
      const goal = goals[config.type] ?? config.defaultGoal;
      const target = goal * 7;
      const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;
      return { config, total, percent };
    });

  const hasData = rows.some((r) => r.total > 0);

  if (dismissed || !hasData) return null;

  function close() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, weekKey);
    } catch {
      // ignorieren
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Wochenrückblick</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="size-7 -mt-1 -mr-1" onClick={close} aria-label="Schließen">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.map(({ config, percent }) => (
          <div key={config.type} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 truncate text-muted-foreground">{config.label}</span>
            <Progress value={percent} className="h-1.5 flex-1" />
            <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">
              {Math.round(percent)}%
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
