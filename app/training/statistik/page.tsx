"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatValue } from "@/components/stat-value";
import { TrainingTabs } from "@/components/training/training-tabs";
import { MuscleGrid } from "@/components/training/muscle-grid";
import { TrainingCalendar } from "@/components/training/training-calendar";
import { TrainingHeatmap } from "@/components/training/training-heatmap";
import { ExerciseProgress } from "@/components/training/exercise-progress";
import { useTraining } from "@/lib/training-store";
import { useMetricData } from "@/lib/use-metric-data";
import { measuredOn, sessionVolume, workingSets } from "@/lib/training";
import { muscleProgress, weekStartISO } from "@/lib/muscle-stats";
import { summarizeSession } from "@/lib/session-stats";
import { formatCompact, formatDateLong, formatNumber } from "@/lib/format";
import { isoDateDaysAgo } from "@/lib/habits";

type Range = "week" | "month" | "year" | "all";

const RANGES: { key: Range; label: string; days: number | null; caption: string }[] = [
  { key: "week", label: "Woche", days: 7, caption: "Letzte 7 Tage" },
  { key: "month", label: "Monat", days: 30, caption: "Letzte 30 Tage" },
  { key: "year", label: "Jahr", days: 365, caption: "Letzte 12 Monate" },
  { key: "all", label: "Alles", days: null, caption: "Gesamter Verlauf" },
];

/** Wie viele Kalenderwochen überhaupt Einheiten enthalten — für „Alles". */
function uniqueWeeks(sessions: { date: string }[]): string[] {
  return [...new Set(sessions.map((s) => weekStartISO(s.date)))];
}

export default function TrainingStatsPage() {
  const { sessions, exerciseById, activePlan, removeSession, loading } = useTraining();
  // Eigengewichtsübungen zählen mit dem Körpergewicht vom Tag der Einheit.
  const { entries: weights } = useMetricData("weight");
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

  const volumeOf = (s: (typeof sessions)[number]) =>
    sessionVolume(s, exerciseById, measuredOn(s.date, weights));
  const volume = inRange.reduce((sum, s) => sum + volumeOf(s), 0);
  const previousVolume = previousWindow.reduce((sum, s) => sum + volumeOf(s), 0);
  const totalSets = inRange.reduce((sum, s) => sum + workingSets(s.sets).length, 0);
  const minutes = inRange.reduce((sum, s) => sum + Math.round((s.durationSeconds ?? 0) / 60), 0);
  const totalReps = inRange.reduce(
    (sum, s) => sum + workingSets(s.sets).reduce((acc, x) => acc + x.reps, 0),
    0
  );

  // Wie viele Wochen der Zeitraum umfasst — Grundlage für alles "pro Woche".
  const weeksInRange =
    config.days === null
      ? Math.max(1, uniqueWeeks(sessions).length)
      : Math.max(1, config.days / 7);
  const setsPerWeek = totalSets / weeksInRange;
  const density = minutes > 0 ? volume / minutes : null;

  // Bestleistungen im Zeitraum: jede Einheit gegen alles, was vor ihr liegt.
  const recordCount = useMemo(
    () =>
      inRange.reduce(
        (sum, session) =>
          sum + summarizeSession(session, sessions, exerciseById, weights).records.length,
        0
      ),
    [inRange, sessions, exerciseById, weights]
  );

  // Konsistenz: Wochen im Zeitraum, in denen das Wochenziel des aktiven Plans
  // erreicht wurde. Ohne Ziel gibt es nichts zu messen.
  const weeklyTarget = activePlan?.weeklyTarget ?? null;
  const consistency = useMemo(() => {
    if (!weeklyTarget) return null;
    const perWeek = new Map<string, Set<string>>();
    for (const session of inRange) {
      const week = weekStartISO(session.date);
      const days = perWeek.get(week) ?? new Set<string>();
      days.add(session.date);
      perWeek.set(week, days);
    }
    const hit = [...perWeek.values()].filter((days) => days.size >= weeklyTarget).length;
    return { hit, weeks: Math.round(weeksInRange) };
  }, [inRange, weeklyTarget, weeksInRange]);

  const progress = useMemo(
    () =>
      muscleProgress(sessions, exerciseById, config.days === 7 ? 8 : 12, new Date(), weights),
    [sessions, exerciseById, config.days, weights]
  );

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
    <div className="flex flex-col gap-5">
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card size="sm" className="gap-0">
              <div className="px-(--card-spacing)">
                <StatValue label="Wiederholungen" value={formatCompact(totalReps)} />
                <p className="mt-1 text-[11px] text-muted-foreground">insgesamt</p>
              </div>
            </Card>
            <Card size="sm" className="gap-0">
              <div className="px-(--card-spacing)">
                <StatValue
                  label="Sätze pro Woche"
                  value={formatNumber(Math.round(setsPerWeek * 10) / 10)}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">über alle Muskeln</p>
              </div>
            </Card>
            <Card size="sm" className="gap-0">
              <div className="px-(--card-spacing)">
                <StatValue
                  label="Dichte"
                  value={density !== null ? formatNumber(Math.round(density)) : "—"}
                  unit={density !== null ? "kg/min" : undefined}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Volumen je Minute</p>
              </div>
            </Card>
            <Card size="sm" className="gap-0">
              <div className="px-(--card-spacing)">
                <StatValue label="Bestleistungen" value={String(recordCount)} />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {consistency
                    ? `${consistency.hit}/${consistency.weeks} Wochen im Ziel`
                    : "neue Rekorde"}
                </p>
              </div>
            </Card>
          </div>

          {/* Ohne diesen Satz wirkt der Sprung im Volumen wie ein Fehler. */}
          <p className="-mt-3 text-xs text-muted-foreground">
            Gezählt werden Arbeitssätze — Aufwärmsätze bleiben außen vor. Übungen mit dem eigenen
            Körper (Klimmzüge, Dips, Liegestütze) gehen mit dem Anteil deines Körpergewichts ins
            Volumen ein, den sie tatsächlich bewegen.
          </p>

          <MuscleGrid progress={progress} />

          <TrainingHeatmap sessions={sessions} />

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
                    <div className="flex items-center gap-2 px-(--card-spacing)">
                      {/* Die Zeile führt zur Einheit — dort steht dieselbe
                          Übersicht wie direkt nach dem Training, samt Bearbeiten. */}
                      <Link
                        href={`/training/einheit/${session.id}`}
                        className="group flex min-w-0 flex-1 items-center gap-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {session.dayName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {formatDateLong(session.date)} ·{" "}
                            {workingSets(session.sets).length} Sätze ·{" "}
                            {formatNumber(Math.round(volumeOf(session)))} kg
                            {session.durationSeconds
                              ? ` · ${Math.round(session.durationSeconds / 60)} min`
                              : ""}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                      </Link>
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
