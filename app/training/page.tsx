"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Play, CalendarDays, Dumbbell, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatValue } from "@/components/stat-value";
import { TrainingTabs } from "@/components/training/training-tabs";
import { useTraining } from "@/lib/training-store";
import { nextDayFor, sessionVolume, MUSCLE_LABELS } from "@/lib/training";
import { formatCompact, formatDateLong, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isoDateDaysAgo, todayISO } from "@/lib/habits";

export default function TrainingOverviewPage() {
  const { activePlan, sessions, exerciseById, loading, error } = useTraining();

  const lastSession = sessions[0];
  const nextDay = useMemo(
    () => (activePlan ? nextDayFor(activePlan, lastSession) : null),
    [activePlan, lastSession]
  );

  const weekStart = isoDateDaysAgo(6);
  const weekSessions = sessions.filter((s) => s.date >= weekStart);

  // Kalenderwoche (Montag–Sonntag) für das Wochenziel — nicht die letzten 7 Tage.
  const mondayISO = (() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toLocaleDateString("sv-SE");
  })();
  const thisWeekCount = new Set(
    sessions.filter((s) => s.date >= mondayISO).map((s) => s.date)
  ).size;
  const weeklyTarget = activePlan?.weeklyTarget ?? null;
  const weekVolume = weekSessions.reduce((sum, s) => sum + sessionVolume(s), 0);
  const weekMinutes = weekSessions.reduce(
    (sum, s) => sum + Math.round((s.durationSeconds ?? 0) / 60),
    0
  );

  const trainedToday = sessions.some((s) => s.date === todayISO());

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="text-sm text-muted-foreground">Pläne, Progression &amp; Verlauf</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">
          Training
        </h1>
      </div>

      <TrainingTabs />

      {error && (
        <Card className="gap-1">
          <p className="px-(--card-spacing) text-sm font-medium">
            Trainingsdaten konnten nicht geladen werden
          </p>
          <p className="px-(--card-spacing) text-sm text-muted-foreground">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="h-44 animate-pulse rounded-card bg-card" />
      ) : nextDay && activePlan ? (
        <Card variant="blush" className="gap-5">
          <div className="flex flex-col gap-1 px-(--card-spacing)">
            <p className="text-sm opacity-75">
              {trainedToday ? "Heute schon trainiert — als Nächstes" : "Als Nächstes dran"}
            </p>
            <p className="font-display text-4xl leading-none tracking-tight sm:text-heading">
              {nextDay.name}
            </p>
            <p className="mt-1 text-sm opacity-75">
              {activePlan.name} · {nextDay.exercises.length}{" "}
              {nextDay.exercises.length === 1 ? "Übung" : "Übungen"}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 px-(--card-spacing)">
            {nextDay.exercises.slice(0, 6).map((pe) => (
              <span
                key={pe.id}
                className="rounded-pill bg-current/10 px-2.5 py-1 text-xs"
              >
                {exerciseById[pe.exerciseId]?.name ?? pe.exerciseId}
              </span>
            ))}
          </div>

          <div className="px-(--card-spacing)">
            <Link
              href={`/training/session?day=${encodeURIComponent(nextDay.id)}`}
              className={buttonVariants({ size: "lg", className: "w-full" })}
            >
              <Play className="size-4" />
              Training starten
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="gap-4">
          <div className="px-(--card-spacing)">
            <p className="text-subheading font-display">Noch kein Plan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Leg einen Trainingsplan an — oder starte mit dem fertigen Push/Pull/Legs-Plan.
            </p>
          </div>
          <div className="px-(--card-spacing)">
            <Link href="/training/plaene" className={buttonVariants({ size: "lg" })}>
              Zu den Plänen
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue label="Einheiten" value={String(weekSessions.length)} />
            <p className="mt-1 text-[11px] text-muted-foreground">letzte 7 Tage</p>
          </div>
        </Card>
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue label="Volumen" value={formatCompact(Math.round(weekVolume))} unit="kg" />
            <p className="mt-1 text-[11px] text-muted-foreground">letzte 7 Tage</p>
          </div>
        </Card>
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue label="Zeit" value={String(weekMinutes)} unit="min" />
            <p className="mt-1 text-[11px] text-muted-foreground">letzte 7 Tage</p>
          </div>
        </Card>
      </div>

      {weeklyTarget !== null && (
        <Card className="gap-3">
          <div className="flex items-baseline justify-between gap-3 px-(--card-spacing)">
            <div>
              <p className="text-xs text-muted-foreground">Diese Woche</p>
              <p className="nums mt-1 text-heading-sm leading-none">
                {thisWeekCount}
                <span className="text-muted-foreground"> / {weeklyTarget}</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {thisWeekCount >= weeklyTarget
                ? "Wochenziel erreicht."
                : `Noch ${weeklyTarget - thisWeekCount} ${
                    weeklyTarget - thisWeekCount === 1 ? "Einheit" : "Einheiten"
                  }`}
            </p>
          </div>
          <div className="px-(--card-spacing)">
            <div className="flex gap-1.5">
              {Array.from({ length: weeklyTarget }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-pill transition-colors",
                    i < thisWeekCount ? "bg-chart-1" : "bg-elevated"
                  )}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Letzte Einheiten</h2>
          <Link
            href="/training/statistik"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Alle ansehen
          </Link>
        </div>

        {loading ? (
          <div className="h-24 animate-pulse rounded-card bg-card" />
        ) : sessions.length === 0 ? (
          <Card className="gap-0">
            <p className="px-(--card-spacing) text-sm text-muted-foreground">
              Noch keine Einheit protokolliert. Nach deinem ersten Training steht hier dein Verlauf.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.slice(0, 6).map((session) => {
              const muscles = new Set(
                session.sets
                  .map((s) => exerciseById[s.exerciseId]?.muscle)
                  .filter((m): m is NonNullable<typeof m> => Boolean(m))
              );
              return (
                <Card key={session.id} size="sm" className="gap-0">
                  <div className="flex items-center gap-3 px-(--card-spacing)">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-tile bg-elevated">
                      <Dumbbell className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{session.dayName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateLong(session.date)} ·{" "}
                        {[...muscles].map((m) => MUSCLE_LABELS[m]).join(", ") || "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="nums text-sm">
                        {formatNumber(Math.round(sessionVolume(session)))} kg
                      </p>
                      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        {session.durationSeconds ? (
                          <>
                            <Timer className="size-3" />
                            {Math.round(session.durationSeconds / 60)} min
                          </>
                        ) : (
                          <>
                            <CalendarDays className="size-3" />
                            {session.sets.length} Sätze
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
