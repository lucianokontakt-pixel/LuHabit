"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatValue } from "@/components/stat-value";
import {
  displayOneRepMax,
  workingSets,
  type Exercise,
  type WorkoutSession,
} from "@/lib/training";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const chartConfig = {
  weight: { label: "Arbeitsgewicht", color: "var(--chart-1)" },
  oneRm: { label: "1RM (geschätzt)", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function ExerciseProgress({
  sessions,
  exerciseById,
}: {
  sessions: WorkoutSession[];
  exerciseById: Record<string, Exercise>;
}) {
  const [query, setQuery] = useState("");

  // Nur Übungen anbieten, für die es auch Verlauf gibt.
  const trained = useMemo(() => {
    const ids = new Set<string>();
    for (const session of sessions) {
      for (const set of workingSets(session.sets)) ids.add(set.exerciseId);
    }
    return [...ids]
      .map((id) => exerciseById[id])
      .filter((e): e is Exercise => Boolean(e))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [sessions, exerciseById]);

  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected && trained.some((e) => e.id === selected) ? selected : trained[0]?.id;
  const active = activeId ? exerciseById[activeId] : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? trained.filter((e) => e.name.toLowerCase().includes(q)) : trained;
  }, [trained, query]);

  const history = useMemo(() => {
    if (!activeId) return [];
    // sessions kommen absteigend — für den Verlauf brauchen wir sie aufsteigend.
    return [...sessions]
      .filter((s) => workingSets(s.sets).some((set) => set.exerciseId === activeId))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((session) => {
        const sets = workingSets(session.sets).filter((s) => s.exerciseId === activeId);
        const topWeight = Math.max(...sets.map((s) => s.weight));
        // Über zwölf Wiederholungen wird bewusst nicht geschätzt — so ein
        // Punkt fehlt in der Linie, statt eine Fantasiezahl beizusteuern.
        const best = sets.reduce<number | null>((acc, s) => {
          const est = displayOneRepMax(s.weight, s.reps);
          return est === null ? acc : Math.max(acc ?? 0, est);
        }, null);
        return {
          date: session.date,
          label: new Date(`${session.date}T00:00:00`).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
          }),
          weight: topWeight,
          oneRm: best,
          volume: sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
          reps: Math.max(...sets.map((s) => s.reps)),
        };
      });
  }, [sessions, activeId]);

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const bestWeight = history.reduce((acc, h) => Math.max(acc, h.weight), 0);
  const bestOneRm = history.reduce((acc, h) => Math.max(acc, h.oneRm ?? 0), 0);

  if (trained.length === 0) {
    return (
      <Card className="gap-0">
        <p className="px-(--card-spacing) text-sm text-muted-foreground">
          Noch keine Übung protokolliert — nach deiner ersten Einheit siehst du hier den Verlauf je
          Übung.
        </p>
      </Card>
    );
  }

  return (
    <Card className="gap-4">
      <div className="px-(--card-spacing)">
        <h2 className="text-subheading font-display">Verlauf je Übung</h2>
        <p className="text-sm text-muted-foreground">
          Arbeitsgewicht und geschätztes Maximum über die Zeit
        </p>
      </div>

      <div className="px-(--card-spacing)">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Übung filtern"
          className="h-10"
        />
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-(--card-spacing)">
        {filtered.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => setSelected(exercise.id)}
            className={cn(
              "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
              exercise.id === activeId
                ? "bg-primary text-primary-foreground"
                : "bg-elevated text-muted-foreground hover:text-foreground"
            )}
          >
            {exercise.name}
          </button>
        ))}
      </div>

      {active && latest && (
        <>
          <div className="grid grid-cols-3 gap-3 px-(--card-spacing)">
            <StatValue
              label="Aktuell"
              value={formatNumber(latest.weight)}
              unit="kg"
              delta={previous ? latest.weight - previous.weight : null}
              deltaUnit="kg"
              direction="up-good"
              size="sm"
            />
            <StatValue label="Bestwert" value={formatNumber(bestWeight)} unit="kg" size="sm" />
            <StatValue label="1RM ≈" value={formatNumber(bestOneRm)} unit="kg" size="sm" />
          </div>

          {/* Auch mit einer einzigen Einheit stehen Achsen und Raster — der
              Punkt markiert den Startwert, aus dem die Kurve wird. */}
          <div className="flex flex-col gap-1 px-(--card-spacing)">
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <LineChart data={history} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  fontSize={11}
                  minTickGap={24}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  width={38}
                  stroke="var(--muted-foreground)"
                  domain={["dataMin - 5", "dataMax + 5"]}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v} kg`} />} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--color-weight)"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "var(--background)", strokeWidth: 1.5 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="oneRm"
                  stroke="var(--color-oneRm)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
            {history.length < 2 && (
              <p className="text-center text-xs text-muted-foreground">
                Eine Einheit reicht noch nicht für einen Verlauf — beim nächsten Mal wird hier eine
                Kurve daraus.
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
