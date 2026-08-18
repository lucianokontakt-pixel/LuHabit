"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Flame, Trophy, Pencil, Check } from "lucide-react";
import { HABITS, HabitType } from "@/lib/habits";
import { useHabitData } from "@/lib/use-habit-data";
import { computeStreaks, sum } from "@/lib/stats";
import { Heatmap } from "@/components/heatmap";
import { WeeklyChart } from "@/components/weekly-chart";
import { isoDateDaysAgo } from "@/lib/habits";

export function HabitDetail({ habit }: { habit: HabitType }) {
  const config = HABITS[habit];
  const Icon = config.icon;
  const { entries, goal, todayValue, loading, addDelta, updateGoal } = useHabitData(habit);
  const [manualValue, setManualValue] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(goal));

  const streaks = computeStreaks(entries, goal);
  const weekEntries = entries.filter((e) => e.date >= isoDateDaysAgo(6));
  const weekTotal = sum(weekEntries);
  const progress = goal > 0 ? Math.min(100, (todayValue / goal) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{config.label}</h1>
          <p className="text-sm text-muted-foreground">Dein Verlauf & heutiger Stand</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Heute</CardDescription>
            <CardTitle className="text-2xl">
              {todayValue}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {goal} {config.unit}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} />
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
              {weekTotal}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{config.unit}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ø {(weekTotal / 7).toFixed(1)} {config.unit} / Tag
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eintragen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {config.quickAdd.map((amount) => (
              <Button key={amount} variant="secondary" onClick={() => addDelta(amount)}>
                +{amount} {config.unit}
              </Button>
            ))}
            {todayValue > 0 && (
              <Button variant="outline" onClick={() => addDelta(-config.step)}>
                -{config.step}
              </Button>
            )}
          </div>
          <Separator />
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const val = Number(manualValue);
              if (Number.isFinite(val) && val >= 0) {
                addDelta(val - todayValue);
                setManualValue("");
              }
            }}
          >
            <Input
              type="number"
              min={0}
              placeholder={`Genauen Wert für heute setzen (${config.unit})`}
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" variant="outline">
              Setzen
            </Button>
          </form>
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
                setEditingGoal(true);
              }}
            >
              <Pencil className="size-3.5" />
              Ziel: {goal} {config.unit}
            </Button>
          ) : (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const val = Number(goalInput);
                if (Number.isFinite(val) && val > 0) {
                  updateGoal(val);
                  setEditingGoal(false);
                }
              }}
            >
              <Input
                type="number"
                min={1}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="h-8 w-24"
                autoFocus
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
            <Heatmap entries={entries} goal={goal} weeks={26} unit={config.unit} />
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

      {config.type === "steps" && (
        <Badge variant="secondary" className="w-fit">
          Tipp: Automatischer Sync per iOS Shortcut möglich — siehe README
        </Badge>
      )}
    </div>
  );
}
