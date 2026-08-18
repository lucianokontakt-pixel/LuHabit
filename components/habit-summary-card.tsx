"use client";

import Link from "next/link";
import type { PointerEventHandler } from "react";
import { Flame, Plus, Minus, RotateCcw, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HabitConfig } from "@/lib/habits";
import { computeStreaks } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Entry } from "@/lib/api-client";

export function HabitSummaryCard({
  habit,
  config,
  entries,
  goal,
  todayValue,
  onQuickAdd,
  onUndo,
  onReset,
  editMode = false,
  isDragging = false,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
  onEdit,
  onDelete,
}: {
  habit: string;
  config: HabitConfig;
  entries: Entry[];
  goal: number;
  todayValue: number;
  onQuickAdd: () => void;
  onUndo: () => void;
  onReset: () => void;
  editMode?: boolean;
  isDragging?: boolean;
  onDragPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onDragPointerMove?: PointerEventHandler<HTMLButtonElement>;
  onDragPointerUp?: PointerEventHandler<HTMLButtonElement>;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const Icon = config.icon;
  const streak = computeStreaks(entries, goal, 60).current;
  const progress = goal > 0 ? Math.min(100, (todayValue / goal) * 100) : 0;
  const quickAmount = config.quickAdd[0];
  const href = config.isCustom ? `/habit/${habit}` : `/${habit}`;

  return (
    <Card
      className={cn(
        "gap-0 p-3 transition-shadow",
        isDragging && "relative z-10 scale-[1.02] shadow-lg"
      )}
    >
      <div className="flex items-center gap-3">
        {editMode && (
          <button
            type="button"
            aria-label="Ziehen zum Sortieren"
            className="touch-none text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
            style={{ cursor: "grab" }}
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            onPointerCancel={onDragPointerUp}
          >
            <GripVertical className="size-5" />
          </button>
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
        {editMode ? (
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
              aria-label="Ziel bearbeiten"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label="Ziel löschen"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : (
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
            {todayValue > 0 && (
              <Button
                variant="outline"
                className="h-11 w-11"
                onClick={onReset}
                aria-label="Heutigen Wert zurücksetzen"
              >
                <RotateCcw className="size-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
