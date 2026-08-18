"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAllHabitsData } from "@/lib/use-all-habits";
import { useHabitRegistry } from "@/lib/habit-registry";
import { HabitSummaryCard } from "@/components/habit-summary-card";
import { AddHabitDialog } from "@/components/add-habit-dialog";
import { WeeklyChart } from "@/components/weekly-chart";
import { Heatmap } from "@/components/heatmap";
import { computeStreaks } from "@/lib/stats";
import { Flame } from "lucide-react";

export default function DashboardPage() {
  const { goals, loading, entriesFor, todayValueFor, addDelta } = useAllHabitsData();
  const { habits, order, loading: habitsLoading } = useHabitRegistry();
  const [selected, setSelected] = useState<string>("steps");

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const isLoading = loading || habitsLoading;
  const selectedConfig = habits[selected] ?? habits["steps"];
  const selectedEntries = entriesFor(selected);
  const selectedGoal = goals[selected] ?? selectedConfig?.defaultGoal ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Übersicht</h1>
        </div>
        <AddHabitDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? order.map((h) => <div key={h} className="h-[168px] animate-pulse rounded-xl bg-muted" />)
          : order.map((habit) => {
              const config = habits[habit];
              if (!config) return null;
              const goal = goals[habit] ?? config.defaultGoal;
              return (
                <HabitSummaryCard
                  key={habit}
                  habit={habit}
                  config={config}
                  entries={entriesFor(habit)}
                  goal={goal}
                  todayValue={todayValueFor(habit)}
                  onQuickAdd={() => addDelta(habit, config.quickAdd[0])}
                  onUndo={() => addDelta(habit, -config.step)}
                />
              );
            })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Verlauf</CardTitle>
              <CardDescription>Letzte 7 Tage</CardDescription>
            </div>
            <Tabs value={selected} onValueChange={setSelected}>
              <TabsList>
                {order.map((h) => (
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
            {order.map((habit) => {
              const config = habits[habit];
              if (!config) return null;
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
        <CardContent>
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
    </div>
  );
}
