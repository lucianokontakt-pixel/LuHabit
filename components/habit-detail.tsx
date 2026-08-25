"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Flame, Trophy, Pencil, Check, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { HabitConfig, HabitType, addDaysISO, isoDateDaysAgo } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { useHabitRegistry } from "@/lib/habit-registry";
import { useHabitData } from "@/lib/use-habit-data";
import { computeStreaks, sum } from "@/lib/stats";
import { formatDayLabel, formatNumber } from "@/lib/format";
import { Heatmap } from "@/components/heatmap";
import { WeeklyChart } from "@/components/weekly-chart";

export function HabitDetail({ habit, config }: { habit: HabitType; config?: HabitConfig }) {
  const { habits, loading: registryLoading } = useHabitRegistry();
  const resolvedConfig = config ?? habits[habit];

  if (!resolvedConfig) {
    if (registryLoading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
    return <p className="text-sm text-muted-foreground">Dieses Ziel wurde nicht gefunden.</p>;
  }

  return <HabitDetailContent habit={habit} resolvedConfig={resolvedConfig} />;
}

function HabitDetailContent({
  habit,
  resolvedConfig,
}: {
  habit: HabitType;
  resolvedConfig: HabitConfig;
}) {
  const Icon = resolvedConfig.icon;
  const isToggle = resolvedConfig.kind === "toggle";
  const {
    entries,
    goal,
    weeklyGoal,
    todayValue,
    valueFor,
    today,
    earliestDate,
    loading,
    addDelta,
    setValueFor,
    updateGoal,
    updateWeeklyGoal,
  } = useHabitData(habit, resolvedConfig.defaultGoal);
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;
  const selectedValue = valueFor(selectedDate);
  const [manualValue, setManualValue] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(goal));
  const [weeklyGoalInput, setWeeklyGoalInput] = useState(weeklyGoal ? String(weeklyGoal) : "");

  const streaks = computeStreaks(entries, goal);
  const weekEntries = entries.filter((e) => e.date >= isoDateDaysAgo(6));
  const weekTotal = sum(weekEntries);
  const progress = goal > 0 ? Math.min(100, (todayValue / goal) * 100) : 0;
  const weeklyProgress =
    weeklyGoal && weeklyGoal > 0 ? Math.min(100, (weekTotal / weeklyGoal) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{resolvedConfig.label}</h1>
          <p className="text-sm text-muted-foreground">Dein Verlauf & heutiger Stand</p>
        </div>
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-3", weeklyProgress !== null && "lg:grid-cols-4")}>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Heute</CardDescription>
            <CardTitle className="text-2xl">
              {isToggle ? (todayValue > 0 ? "Erledigt" : "Offen") : formatNumber(todayValue)}
              {!isToggle && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / {formatNumber(goal)} {resolvedConfig.unit}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={isToggle ? (todayValue > 0 ? 100 : 0) : progress} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Streak</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Flame className="size-5 text-foreground" />
              {streaks.current}
              <span className="text-sm font-normal text-muted-foreground">Tage</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Trophy className="size-3.5" />
            Rekord: {streaks.longest} Tage
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Letzte 7 Tage</CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(weekTotal)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{resolvedConfig.unit}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ø {formatNumber(Math.round((weekTotal / 7) * 10) / 10)} {resolvedConfig.unit} / Tag
          </CardContent>
        </Card>

        {weeklyProgress !== null && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <CalendarRange className="size-3.5" />
                Wochenziel
              </CardDescription>
              <CardTitle className="text-2xl">
                {Math.round(weeklyProgress)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">%</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={weeklyProgress} />
              <p className="mt-2 text-xs text-muted-foreground">
                {formatNumber(weekTotal)} / {formatNumber(weeklyGoal ?? 0)} {resolvedConfig.unit}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Eintragen</CardTitle>
          {/* Tagesauswahl: vergessene Tage lassen sich nachtragen, statt als
              Loch in Heatmap und Streak stehen zu bleiben. */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Einen Tag zurück"
              disabled={selectedDate <= earliestDate}
              onClick={() => setSelectedDate((d) => addDaysISO(d, -1))}
            >
              <ChevronLeft />
            </Button>
            <span
              className={cn(
                "min-w-[7.5rem] text-center text-sm tabular-nums",
                !isToday && "font-medium"
              )}
            >
              {formatDayLabel(selectedDate, today)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Einen Tag vor"
              disabled={isToday}
              onClick={() => setSelectedDate((d) => addDaysISO(d, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!isToday && (
            <p className="text-xs text-muted-foreground">
              Du trägst für {formatDayLabel(selectedDate, today).toLowerCase()} nach.{" "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => setSelectedDate(today)}
              >
                Zurück zu heute
              </button>
            </p>
          )}

          {isToggle ? (
            <Button
              variant={selectedValue > 0 ? "secondary" : "outline"}
              className="h-11 w-full max-w-xs gap-1.5"
              onClick={() => addDelta(selectedValue > 0 ? -selectedValue : 1, selectedDate)}
            >
              <Check className={cn("size-4", selectedValue <= 0 && "opacity-40")} />
              {selectedValue > 0 ? "Geschafft" : "Als erledigt markieren"}
            </Button>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {resolvedConfig.quickAdd.map((amount) => (
                  <Button
                    key={amount}
                    variant="secondary"
                    onClick={() => addDelta(amount, selectedDate)}
                  >
                    +{amount} {resolvedConfig.unit}
                  </Button>
                ))}
                {selectedValue > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => addDelta(-resolvedConfig.step, selectedDate)}
                  >
                    -{resolvedConfig.step}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Stand: {formatNumber(selectedValue)} / {formatNumber(goal)}{" "}
                {resolvedConfig.unit}
              </p>
              <Separator />
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = Number(manualValue);
                  if (Number.isFinite(val) && val >= 0) {
                    setValueFor(val, selectedDate);
                    setManualValue("");
                  }
                }}
              >
                <Input
                  type="number"
                  min={0}
                  placeholder={`Genauen Wert setzen (${resolvedConfig.unit})`}
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" variant="outline">
                  Setzen
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Verlauf</CardTitle>
            <CardDescription>Letzte 7 Tage</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <WeeklyChart entries={entries} goal={goal} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Contribution-Verlauf</CardTitle>
            <CardDescription>Letzte 26 Wochen</CardDescription>
          </div>
          {!editingGoal ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGoalInput(String(goal));
                setWeeklyGoalInput(weeklyGoal ? String(weeklyGoal) : "");
                setEditingGoal(true);
              }}
            >
              <Pencil className="size-3.5" />
              Ziel: {formatNumber(goal)}
              {weeklyGoal ? ` · Woche: ${formatNumber(weeklyGoal)}` : ""} {resolvedConfig.unit}
            </Button>
          ) : (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const val = Number(goalInput);
                const weeklyVal = weeklyGoalInput.trim() ? Number(weeklyGoalInput) : null;
                if (!Number.isFinite(val) || val <= 0) return;
                if (weeklyGoalInput.trim() && (!Number.isFinite(weeklyVal) || (weeklyVal ?? 0) <= 0)) {
                  return;
                }
                updateGoal(val);
                updateWeeklyGoal(weeklyVal);
                setEditingGoal(false);
              }}
            >
              <Input
                type="number"
                min={1}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Tagesziel"
                className="h-8 w-24"
                autoFocus
              />
              <Input
                type="number"
                min={1}
                value={weeklyGoalInput}
                onChange={(e) => setWeeklyGoalInput(e.target.value)}
                placeholder="Wochenziel"
                className="h-8 w-24"
              />
              <Button type="submit" size="sm" variant="secondary">
                <Check className="size-3.5" />
              </Button>
            </form>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : (
            <Heatmap entries={entries} goal={goal} weeks={26} unit={resolvedConfig.unit} />
          )}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Weniger</span>
            {["bg-muted", "bg-primary/20", "bg-primary/45", "bg-primary/70", "bg-primary"].map(
              (c) => (
                <span key={c} className={`size-3 rounded-[2px] ${c}`} />
              )
            )}
            <span>Mehr</span>
          </div>
        </CardContent>
      </Card>

      {resolvedConfig.type === "steps" && (
        <Badge variant="secondary" className="w-fit">
          Tipp: Automatischer Sync per iOS Shortcut möglich — siehe README
        </Badge>
      )}
    </div>
  );
}
