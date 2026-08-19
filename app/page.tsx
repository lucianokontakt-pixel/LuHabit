"use client";

import { useState } from "react";
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
import { Pencil } from "lucide-react";
import { useAllHabitsData } from "@/lib/use-all-habits";
import { useHabitRegistry } from "@/lib/habit-registry";
import { useCardOrder } from "@/lib/use-card-order";
import { useDragSort } from "@/lib/use-drag-sort";
import { HabitSummaryCard } from "@/components/habit-summary-card";
import { AddHabitDialog } from "@/components/add-habit-dialog";
import { HabitFormDialog, type HabitFormResult } from "@/components/habit-form-dialog";
import { WeeklyReview } from "@/components/weekly-review";
import { DayGoalHero } from "@/components/day-goal-hero";

export default function DashboardPage() {
  const { goals, loading, entriesFor, todayValueFor, addDelta, setValue, entries } =
    useAllHabitsData();
  const { habits, order: registryOrder, loading: habitsLoading, editCustomHabit, removeCustomHabit } =
    useHabitRegistry();
  const { order, reorder } = useCardOrder(registryOrder);
  const [editMode, setEditMode] = useState(false);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const isLoading = loading || habitsLoading;
  const validOrder = order.filter((id) => habits[id]);
  const { displayOrder, draggingId, setItemRef, dragHandlers } = useDragSort(validOrder, reorder);

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
    <div className="flex flex-col gap-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm capitalize text-muted-foreground">{today}</p>
          <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">
            Übersicht
          </h1>
        </div>
        <AddHabitDialog />
      </div>

      {!isLoading && validOrder.length > 0 && (
        <DayGoalHero reached={goalsReached} total={validOrder.length} />
      )}

      {!isLoading && (
        <WeeklyReview order={validOrder} habits={habits} goals={goals} entries={entries} />
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Deine Habits</h2>
          <Button
            variant={editMode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setEditMode((v) => !v)}
          >
            {/* Nur "Bearbeiten" trägt das Stift-Icon — "Fertig" bleibt reiner Text. */}
            {!editMode && <Pencil />}
            {editMode ? "Fertig" : "Bearbeiten"}
          </Button>
        </div>

        {editMode && (
          <p className="text-xs text-muted-foreground">
            Karte gedrückt halten und ziehen, um die Reihenfolge zu ändern.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[164px] animate-pulse rounded-card bg-card" />
              ))
            : displayOrder.map((habit) => {
                const config = habits[habit];
                const goal = goals[habit] ?? config.defaultGoal;
                return (
                  <div
                    key={habit}
                    ref={(el) => setItemRef(habit, el)}
                    {...(editMode ? dragHandlers(habit) : {})}
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
                    />
                  </div>
                );
              })}
        </div>
      </section>

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
