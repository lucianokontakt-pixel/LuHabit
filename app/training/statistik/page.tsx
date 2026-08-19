"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatValue } from "@/components/stat-value";
import { TrainingTabs } from "@/components/training/training-tabs";
import { MuscleVolume } from "@/components/training/muscle-volume";
import { TrainingCalendar } from "@/components/training/training-calendar";
import { ExerciseProgress } from "@/components/training/exercise-progress";
import { useTraining } from "@/lib/training-store";
import { MUSCLES, sessionVolume, type Muscle } from "@/lib/training";
import { formatCompact, formatDateLong, formatNumber } from "@/lib/format";
import { isoDateDaysAgo } from "@/lib/habits";

type Range = "week" | "month" | "year" | "all";

const RANGES: { key: Range; label: string; days: number | null; caption: string }[] = [
  { key: "week", label: "Woche", days: 7, caption: "Letzte 7 Tage" },
  { key: "month", label: "Monat", days: 30, caption: "Letzte 30 Tage" },
  { key: "year", label: "Jahr", days: 365, caption: "Letzte 12 Monate" },
  { key: "all", label: "Alles", days: null, caption: "Gesamter Verlauf" },
];

export default function TrainingStatsPage() {
  const { sessions, exerciseById, removeSession, loading } = useTraining();
  const [range, setRange] = useState<Range>("month");
  const [deleting, setDeleting] = useState<string | null>(null);

  const config = RANGES.find((r) => r.key === range) ?? RANGES[1];
  const from = config.days === null ? null : isoDateDaysAgo(config.days - 1);

  const inRange = useMemo(
    () => (from ? sessions.filter((s) => s.date >= from) : sessions),
    [sessions, from]
  );

  const previousWindow = useMemo(() => {
    if (config.days === null) return [];
    const start = isoDateDaysAgo(config.days * 2 - 1);
    const end = isoDateDaysAgo(config.days);
    return sessions.filter((s) => s.date >= start && s.date <= end);
  }, [sessions, config.days]);

  const volume = inRange.reduce((sum, s) => sum + sessionVolume(s), 0);
  const previousVolume = previousWindow.reduce((sum, s) => sum + sessionVolume(s), 0);
  const totalSets = inRange.reduce((sum, s) => sum + s.sets.filter((x) => x.done).length, 0);
  const minutes = inRange.reduce((sum, s) => sum + Math.round((s.durationSeconds ?? 0) / 60), 0);

  const volumeByMuscle = useMemo(() => {
    const map = Object.fromEntries(MUSCLES.map((m) => [m.key, 0])) as Record<Muscle, number>;
    for (const session of inRange) {
      for (const set of session.sets) {
        if (!set.done) continue;
        const muscle = exerciseById[set.exerciseId]?.muscle;
        if (!muscle) continue;
        map[muscle] += set.weight * set.reps;
      }
    }
    return map;
  }, [inRange, exerciseById]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await removeSession(id);
      toast.success("Einheit gelöscht");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Einheit nicht löschen");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Volumen, Bestleistungen &amp; Frequenz</p>
          <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">
            Statistik
          </h1>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.key} value={r.key}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <TrainingTabs />

      {loading ? (
        <div className="h-32 animate-pulse rounded-card bg-card" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card size="sm" className="gap-0">
              <div className="px-(--card-spacing)">
                <StatValue label="Einheiten" value={String(inRange.length)} />
                <p className="mt-1 text-[11px] text-muted-foreground">{config.caption}</p>
              </div>
            </Card>
            <Card size="sm" className="gap-0">
              <div className="px-(--card-spacing)">
                <StatValue
                  label="Volumen"
                  value={formatCompact(Math.round(volume))}
                  unit="kg"
                  delta={
                    config.days !== null && previousVolume > 0
                      ? ((volume - previousVolume) / previousVolume) * 100
                      : null
                  }
                  deltaUnit="%"
                  deltaLabel="vs. davor"
                  direction="up-good"
                />
              </div>
            </Card>
            <Card size="sm" className="gap-0">
              <div className="px-(--card-spacing)">
                <StatValue label="Sätze" value={String(totalSets)} />
                <p className="mt-1 text-[11px] text-muted-foreground">abgehakt</p>
              </div>
            </Card>
            <Card size="sm" className="gap-0">
              <div className="px-(--card-spacing)">
                <StatValue label="Zeit" value={String(minutes)} unit="min" />
                <p className="mt-1 text-[11px] text-muted-foreground">im Gym</p>
              </div>
            </Card>
          </div>

          <MuscleVolume volumeByMuscle={volumeByMuscle} rangeLabel={config.caption} />

          <TrainingCalendar sessions={sessions} months={3} />

          <ExerciseProgress sessions={sessions} exerciseById={exerciseById} />

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Alle Einheiten ({inRange.length})
            </h2>

            {inRange.length === 0 ? (
              <Card className="gap-0">
                <p className="px-(--card-spacing) text-sm text-muted-foreground">
                  In diesem Zeitraum keine Einheit.
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {inRange.map((session) => (
                  <Card key={session.id} size="sm" className="gap-0">
                    <div className="flex items-center gap-3 px-(--card-spacing)">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{session.dayName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDateLong(session.date)} ·{" "}
                          {session.sets.filter((s) => s.done).length} Sätze ·{" "}
                          {formatNumber(Math.round(sessionVolume(session)))} kg
                          {session.durationSeconds
                            ? ` · ${Math.round(session.durationSeconds / 60)} min`
                            : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={deleting === session.id}
                        onClick={() => handleDelete(session.id)}
                        aria-label={`Einheit vom ${session.date} löschen`}
                        className="shrink-0 hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
