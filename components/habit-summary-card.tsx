"use client";

import Link from "next/link";
import { Flame, Plus, Minus, ChevronUp, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HabitConfig } from "@/lib/habits";
import { computeStreaks } from "@/lib/stats";
import type { Entry } from "@/lib/api-client";

export function HabitSummaryCard({
  habit,
  config,
  entries,
  goal,
  todayValue,
  onQuickAdd,
  onUndo,
  editMode = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
}: {
  habit: string;
  config: HabitConfig;
  entries: Entry[];
  goal: number;
  todayValue: number;
  onQuickAdd: () => void;
  onUndo: () => void;
  editMode?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const Icon = config.icon;
  const streak = computeStreaks(entries, goal, 60).current;
  const progress = goal > 0 ? Math.min(100, (todayValue / goal) * 100) : 0;
  const quickAmount = config.quickAdd[0];
  const href = config.isCustom ? `/habit/${habit}` : `/${habit}`;

  return (
    <Card className="gap-0 p-3">
      <div className="flex items-center gap-3">
        {editMode && (
          <div className="flex shrink-0 flex-col">
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              aria-label="Nach oben verschieben"
              className="text-muted-foreground disabled:opacity-20 hover:text-foreground"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              aria-label="Nach unten verschieben"
              className="text-muted-foreground disabled:opacity-20 hover:text-foreground"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        )}
        <Link
          href={href}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary"
        >
          <Icon className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link href={href} className="truncate text-sm font-medium hover:underline">
              {config.label}
            </Link>
            {streak > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Flame className="size-3.5" />
                {streak}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {todayValue}/{goal}
            </span>
          </div>
        </div>
        {!editMode && (
          <div className="flex shrink-0 gap-1.5">
            <Button
              variant="secondary"
              className="h-11 min-w-11 flex-col gap-0 px-2"
              onClick={onQuickAdd}
              aria-label={`+${quickAmount} ${config.unit}`}
            >
              <Plus className="size-3.5" />
              <span className="text-[10px] font-normal leading-none">{quickAmount}</span>
            </Button>
            {todayValue > 0 && (
              <Button
                variant="outline"
                className="h-11 w-11"
                onClick={onUndo}
                aria-label="Verklickt? Rückgängig"
              >
                <Minus className="size-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
