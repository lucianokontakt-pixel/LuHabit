"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowUpDown, Check, Target } from "lucide-react";
import { useAllHabitsData } from "@/lib/use-all-habits";
import { useHabitRegistry } from "@/lib/habit-registry";
import { useCardOrder } from "@/lib/use-card-order";
import { HabitSummaryCard } from "@/components/habit-summary-card";
import { AddHabitDialog } from "@/components/add-habit-dialog";
import { HabitFormDialog, type HabitFormResult } from "@/components/habit-form-dialog";
import { WeeklyReview } from "@/components/weekly-review";
import { WeeklyChart } from "@/components/weekly-chart";
import { Heatmap } from "@/components/heatmap";
import { computeStreaks } from "@/lib/stats";
import { Flame } from "lucide-react";

export default function DashboardPage() {
  const { goals, loading, entries, entriesFor, todayValueFor, addDelta, setValue } = useAllHabitsData();
  const { habits, order: registryOrder, loading: habitsLoading, editCustomHabit, removeCustomHabit } =
    useHabitRegistry();
  const { order, reorder } = useCardOrder(registryOrder);
  const [selected, setSelected] = useState<string>("steps");
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<string[] | null>(null);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rectsRef = useRef<Map<string, DOMRect>>(new Map());

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const isLoading = loading || habitsLoading;
  const selectedConfig = habits[selected] ?? habits["steps"];
  const selectedEntries = entriesFor(selected);
  const selectedGoal = goals[selected] ?? selectedConfig?.defaultGoal ?? 0;

  const validOrder = order.filter((id) => habits[id]);
  const displayOrder = draggingId && previewOrder ? previewOrder : validOrder;

  // FLIP-Animation: Karten gleiten sanft an ihre neue Position statt zu springen.
  useLayoutEffect(() => {
    const newRects = new Map<string, DOMRect>();
    for (const id of displayOrder) {
      const el = itemRefs.current.get(id);
      if (el) newRects.set(id, el.getBoundingClientRect());
    }
    for (const [id, el] of itemRefs.current) {
      if (id === draggingId) continue;
      const prev = rectsRef.current.get(id);
      const next = newRects.get(id);
      if (prev && next && (prev.left !== next.left || prev.top !== next.top)) {
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform 200ms ease";
          el.style.transform = "";
        });
      }
    }
    rectsRef.current = newRects;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animiert nur beim tatsächlichen Reihenfolge-Wechsel
  }, [displayOrder.join(",")]);

  function handleDragPointerDown(id: string, e: ReactPointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(id);
    setPreviewOrder(validOrder);
  }

  function handleDragPointerMove(id: string, e: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingId !== id || !previewOrder) return;
    const clientY = e.clientY;
    const fromIndex = previewOrder.indexOf(id);
    let toIndex = fromIndex;
    for (let i = 0; i < previewOrder.length; i++) {
      if (i === fromIndex) continue;
      const rect = itemRefs.current.get(previewOrder[i])?.getBoundingClientRect();
      if (!rect) continue;
      const midY = rect.top + rect.height / 2;
      if (clientY < midY && i < fromIndex) toIndex = i;
      if (clientY > midY && i > fromIndex) toIndex = i;
    }
    if (toIndex !== fromIndex) {
      const next = [...previewOrder];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setPreviewOrder(next);
    }
  }

  function handleDragPointerUp() {
    if (previewOrder) reorder(previewOrder);
    setDraggingId(null);
    setPreviewOrder(null);
  }

  async function handleEditSubmit(result: HabitFormResult) {
    if (!editingHabit) return;
    await editCustomHabit(editingHabit, result);
  }

  async function handleConfirmDelete() {
    if (!deletingHabit) return;
    await removeCustomHabit(deletingHabit);
    if (editingHabit === deletingHabit) setEditingHabit(null);
    setDeletingHabit(null);
  }

  const goalsReached = validOrder.filter((id) => {
    const config = habits[id];
    const goal = goals[id] ?? config.defaultGoal;
    return todayValueFor(id) >= goal;
  }).length;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Übersicht</h1>
        </div>
        <AddHabitDialog />
      </div>

      {!isLoading && validOrder.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <Target className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {goalsReached} von {validOrder.length} Zielen heute erreicht
            </p>
          </div>
          {goalsReached === validOrder.length && (
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Check className="size-3.5" />
              Alles geschafft
            </span>
          )}
        </div>
      )}

      {!isLoading && (
        <WeeklyReview order={validOrder} habits={habits} goals={goals} entries={entries} />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Deine Habits</h2>
        <Button
          variant={editMode ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setEditMode((v) => !v)}
        >
          <ArrowUpDown className="size-3.5" />
          {editMode ? "Fertig" : "Sortieren"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? order.map((h) => <div key={h} className="h-[76px] animate-pulse rounded-xl bg-muted" />)
          : displayOrder.map((habit) => {
              const config = habits[habit];
              const goal = goals[habit] ?? config.defaultGoal;
              return (
                <div
                  key={habit}
                  ref={(el) => {
                    if (el) itemRefs.current.set(habit, el);
                    else itemRefs.current.delete(habit);
                  }}
                >
                  <HabitSummaryCard
                    habit={habit}
                    config={config}
                    entries={entriesFor(habit)}
                    goal={goal}
                    todayValue={todayValueFor(habit)}
                    onQuickAdd={() => addDelta(habit, config.quickAdd[0])}
                    onUndo={() => addDelta(habit, -config.step)}
                    onReset={() => setValue(habit, 0)}
                    onEdit={() => setEditingHabit(habit)}
                    onDelete={() => setDeletingHabit(habit)}
                    editMode={editMode}
                    isDragging={draggingId === habit}
                    onDragPointerDown={(e) => handleDragPointerDown(habit, e)}
                    onDragPointerMove={(e) => handleDragPointerMove(habit, e)}
                    onDragPointerUp={handleDragPointerUp}
                  />
                </div>
              );
            })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Verlauf</CardTitle>
              <CardDescription>Letzte 7 Tage</CardDescription>
            </div>
            <Tabs value={selected} onValueChange={setSelected}>
              <TabsList className="max-w-full overflow-x-auto">
                {validOrder.map((h) => (
                  <TabsTrigger key={h} value={h}>
                    {habits[h]?.label ?? h}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[180px] animate-pulse rounded-md bg-muted" />
            ) : (
              <WeeklyChart entries={selectedEntries} goal={selectedGoal} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Streaks</CardTitle>
            <CardDescription>Aktuelle Serie je Habit</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {validOrder.map((habit) => {
              const config = habits[habit];
              const Icon = config.icon;
              const goal = goals[habit] ?? config.defaultGoal;
              const streak = computeStreaks(entriesFor(habit), goal, 60).current;
              return (
                <div key={habit} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{config.label}</span>
                  </div>
                  <span className="flex items-center gap-1 font-medium tabular-nums">
                    <Flame className="size-3.5" />
                    {streak}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Contribution History — {selectedConfig?.label}
          </CardTitle>
          <CardDescription>Letzte 26 Wochen</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : (
            <Heatmap
              entries={selectedEntries}
              goal={selectedGoal}
              weeks={26}
              unit={selectedConfig?.unit ?? ""}
            />
          )}
        </CardContent>
      </Card>

      <HabitFormDialog
        open={!!editingHabit && !!habits[editingHabit]}
        onOpenChange={(open) => !open && setEditingHabit(null)}
        initial={editingHabit ? habits[editingHabit] : undefined}
        onSubmit={handleEditSubmit}
      />

      <AlertDialog open={!!deletingHabit} onOpenChange={(open) => !open && setDeletingHabit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              &bdquo;{deletingHabit ? habits[deletingHabit]?.label : ""}&ldquo; löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Die Karte verschwindet vom Dashboard. Bisherige Einträge und der Verlauf werden
              ebenfalls gelöscht. Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
