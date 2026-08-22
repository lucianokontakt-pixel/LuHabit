"use client";

import Link from "next/link";
import { Flame, Plus, Minus, RotateCcw, Pencil, Trash2, Check, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HabitConfig } from "@/lib/habits";
import { computeStreaks } from "@/lib/stats";
import { formatCompact, formatNumber } from "@/lib/format";
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
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const Icon = config.icon;
  const isToggle = config.kind === "toggle";
  const streak = computeStreaks(entries, goal, 60).current;
  const progress = goal > 0 ? Math.min(100, (todayValue / goal) * 100) : 0;
  const started = todayValue > 0;
  const reached = goal > 0 && todayValue >= goal;
  const quickAmount = config.quickAdd[0];
  const href = `/habit/${habit}`;

  return (
    <Card
      size="sm"
      className={cn(
        "gap-3 select-none",
        editMode && "cursor-grab touch-none",
        isDragging && "relative z-20 cursor-grabbing shadow-float"
      )}
    >
      <div className="flex items-center gap-2 px-(--card-spacing)">
        {editMode ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-tile bg-elevated text-muted-foreground">
            <GripVertical className="size-4" />
          </span>
        ) : (
          <Link
            href={href}
            aria-label={`${config.label} öffnen`}
            className="flex size-8 shrink-0 items-center justify-center rounded-tile bg-elevated text-foreground transition-transform active:scale-95"
          >
            <Icon className="size-4" />
          </Link>
        )}

        {editMode ? (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{config.label}</span>
        ) : (
          <Link href={href} className="min-w-0 flex-1 truncate text-sm font-medium">
            {config.label}
          </Link>
        )}

        {/* Reset lebt oben rechts, damit der Stepper unten zwei gleich große
            Hälften behält — und erscheint nur, wenn es etwas zurückzusetzen gibt. */}
        {!editMode && started && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onReset}
            aria-label="Heutigen Wert zurücksetzen"
            className="-mr-1 shrink-0 opacity-60 hover:opacity-100"
          >
            <RotateCcw />
          </Button>
        )}
      </div>

      {!isToggle && (
        <div className="flex flex-col gap-2 px-(--card-spacing)">
          <div className="flex items-end justify-between gap-2">
            <span className="nums text-heading-sm leading-none">
              {formatCompact(todayValue)}
            </span>
            {streak > 1 && (
              <span className="flex shrink-0 items-center gap-1 rounded-pill bg-blush px-2 py-0.5 text-[11px] font-medium text-blush-foreground">
                <Flame className="size-3" />
                {streak}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            von {formatNumber(goal)} {config.unit}
          </p>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {isToggle && (
        // Dieselbe Zeilenstruktur wie beim Zähler (Wert, Bildunterschrift,
        // Balken) — sonst ist die Karte spürbar niedriger als ihre Nachbarn
        // im Grid und die Reihe wirkt schief.
        <div className="flex flex-col gap-2 px-(--card-spacing)">
          <div className="flex items-end justify-between gap-2">
            <span className="nums text-heading-sm leading-none">{reached ? "✓" : "–"}</span>
            {streak > 1 && (
              <span className="flex shrink-0 items-center gap-1 rounded-pill bg-blush px-2 py-0.5 text-[11px] font-medium text-blush-foreground">
                <Flame className="size-3" />
                {streak}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {reached ? "Heute erledigt" : "Heute noch offen"}
          </p>
          <Progress value={reached ? 100 : 0} className="h-1" />
        </div>
      )}

      <div className="px-(--card-spacing)">
        {editMode ? (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-10 flex-1" onClick={onEdit}>
              <Pencil />
              Bearbeiten
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="h-10 w-10 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label={`${config.label} löschen`}
            >
              <Trash2 />
            </Button>
          </div>
        ) : isToggle ? (
          <Button
            variant={reached ? "blush" : "outline"}
            className="h-11 w-full gap-1.5"
            onClick={reached ? onReset : onQuickAdd}
            aria-label={reached ? "Als nicht erledigt markieren" : "Als erledigt markieren"}
          >
            <Check className={cn("size-4", !reached && "opacity-40")} />
            {reached ? "Geschafft" : "Erledigt?"}
          </Button>
        ) : (
          // Minus und Plus liegen als zwei Hälften in einer Pille nebeneinander.
          <div className="flex h-11 items-stretch overflow-hidden rounded-pill bg-elevated ring-1 ring-foreground/8">
            <button
              type="button"
              onClick={onUndo}
              disabled={!started}
              aria-label={`${config.step} ${config.unit} abziehen`}
              className="flex w-12 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:bg-foreground/5 disabled:opacity-25"
            >
              <Minus className="size-4" />
            </button>
            <span aria-hidden className="my-2.5 w-px bg-border" />
            <button
              type="button"
              onClick={onQuickAdd}
              aria-label={`${quickAmount} ${config.unit} hinzufügen`}
              className="flex flex-1 items-center justify-center gap-1 text-sm font-medium transition-colors hover:bg-foreground/5 active:bg-foreground/10"
            >
              <Plus className="size-3.5" />
              <span className="nums">{formatCompact(quickAmount)}</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
