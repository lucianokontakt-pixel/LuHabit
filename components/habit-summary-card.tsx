"use client";

import Link from "next/link";
import { Flame, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HABITS, HabitType } from "@/lib/habits";
import { computeStreaks } from "@/lib/stats";
import type { Entry } from "@/lib/api-client";

export function HabitSummaryCard({
  habit,
  entries,
  goal,
  todayValue,
  onQuickAdd,
}: {
  habit: HabitType;
  entries: Entry[];
  goal: number;
  todayValue: number;
  onQuickAdd: () => void;
}) {
  const config = HABITS[habit];
  const Icon = config.icon;
  const streak = computeStreaks(entries, goal, 60).current;
  const progress = goal > 0 ? Math.min(100, (todayValue / goal) * 100) : 0;
  const quickAmount = config.quickAdd[0];

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between pb-0">
        <Link href={`/${habit}`} className="flex items-center gap-2 group">
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary">
            <Icon className="size-4" />
          </div>
          <span className="text-sm font-medium group-hover:underline">{config.label}</span>
        </Link>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Flame className="size-3.5" />
            {streak}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums">{todayValue}</span>
            <span className="text-sm text-muted-foreground">
              / {goal} {config.unit}
            </span>
          </div>
          <Progress value={progress} className="mt-2 h-1.5" />
        </div>
        <Button size="sm" variant="secondary" className="w-full" onClick={onQuickAdd}>
          <Plus className="size-3.5" />+{quickAmount} {config.unit}
        </Button>
      </CardContent>
    </Card>
  );
}
