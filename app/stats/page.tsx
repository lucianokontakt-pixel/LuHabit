"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyChart } from "@/components/weekly-chart";
import { Heatmap } from "@/components/heatmap";
import { CombinedTrendChart, type ChartRange } from "@/components/combined-trend-chart";
import { useAllHabitsData } from "@/lib/use-all-habits";
import { useHabitRegistry } from "@/lib/habit-registry";
import { computeStreaks } from "@/lib/stats";

export default function StatsPage() {
  const { goals, loading, entriesFor, entries } = useAllHabitsData();
  const { habits, order: registryOrder, loading: habitsLoading } = useHabitRegistry();
  const validOrder = registryOrder.filter((id) => habits[id]);
  const isLoading = loading || habitsLoading;

  const [range, setRange] = useState<ChartRange>("week");
  const [selected, setSelected] = useState<string>("");
  const selectedId = selected && habits[selected] ? selected : validOrder[0];
  const selectedConfig = habits[selectedId];
  const selectedEntries = selectedId ? entriesFor(selectedId) : [];
  const selectedGoal = selectedId ? goals[selectedId] ?? selectedConfig?.defaultGoal ?? 0 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-muted-foreground">Verlauf und Vergleich deiner Habits</p>
          <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as ChartRange)}>
          <TabsList>
            <TabsTrigger value="week">Woche</TabsTrigger>
            <TabsTrigger value="month">Monat</TabsTrigger>
            <TabsTrigger value="year">Jahr</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!isLoading && validOrder.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alle Habits im Vergleich</CardTitle>
            <CardDescription>Prozent vom jeweiligen Ziel, ein Punkt pro Zeitpunkt</CardDescription>
          </CardHeader>
          <CardContent>
            <CombinedTrendChart
              order={validOrder}
              habits={habits}
              goals={goals}
              entries={entries}
              range={range}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Verlauf</CardTitle>
              <CardDescription>
                {range === "week" ? "Letzte 7 Tage" : range === "month" ? "Letzte 30 Tage" : "Letzte 12 Monate"}
              </CardDescription>
            </div>
            {/* w-full + min-w-0 sind hier Pflicht, nicht Kosmetik: ohne w-full
                nimmt sich dieses Flex-Kind (items-start, kein stretch) auf
                Mobile einfach seine natürliche Breite — bei vielen Habit-Namen
                breiter als der Bildschirm. Ohne min-w-0 verhindert dasselbe ab
                sm: in der Zeilen-Anordnung, dass es unter seine Inhaltsbreite
                schrumpft. In beiden Fällen kommt TabsLists eigenes
                overflow-x-auto nie zum Zug, weil der Rahmen nie eingeengt
                wird — die ganze Seite scrollt horizontal statt nur die Leiste. */}
            <Tabs
              value={selectedId ?? ""}
              onValueChange={setSelected}
              className="w-full min-w-0 sm:w-auto"
            >
              <TabsList className="max-w-full overflow-x-auto">
                {validOrder.map((h) => (
                  <TabsTrigger key={h} value={h} className="shrink-0">
                    {habits[h]?.label ?? h}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[140px] animate-pulse rounded-md bg-muted" />
            ) : (
              <WeeklyChart
                entries={selectedEntries}
                goal={selectedGoal}
                days={range === "week" ? 7 : 30}
                monthly={range === "year"}
              />
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
            Contribution History{selectedConfig ? ` — ${selectedConfig.label}` : ""}
          </CardTitle>
          <CardDescription>{range === "year" ? "Letzte 52 Wochen" : "Letzte 26 Wochen"}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : (
            <Heatmap
              entries={selectedEntries}
              goal={selectedGoal}
              weeks={range === "year" ? 52 : 26}
              unit={selectedConfig?.unit ?? ""}
            />
          )}
        </CardContent>
      </Card>

    </div>
  );
}
