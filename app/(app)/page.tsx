"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Play, CalendarDays, Dumbbell, Shuffle, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { WeekCard } from "@/components/training/week-card";
import { WelcomeCard } from "@/components/training/welcome-card";
import { DayPicker } from "@/components/training/day-picker";
import { useTraining } from "@/lib/training-store";
import { useMetricData } from "@/lib/use-metric-data";
import { measuredOn, nextDayFor, sessionVolume, MUSCLE_LABELS } from "@/lib/training";
import { formatDateLong, formatNumber } from "@/lib/format";
import { todayISO } from "@/lib/datum";
import { cn } from "@/lib/utils";

export default function TrainingOverviewPage() {
  const { activePlan, sessions, exerciseById, loading, error } = useTraining();
  // Eigengewichtsübungen zählen mit dem Körpergewicht vom Tag der Einheit.
  const { entries: weights } = useMetricData("weight");
  const volumeOf = (s: (typeof sessions)[number]) =>
    sessionVolume(s, exerciseById, measuredOn(s.date, weights));

  const lastSession = sessions[0];
  const nextDay = useMemo(
    () => (activePlan ? nextDayFor(activePlan, lastSession) : null),
    [activePlan, lastSession]
  );

  const weeklyTarget = activePlan?.weeklyTarget ?? null;
  const trainedToday = sessions.some((s) => s.date === todayISO());
  const [picking, setPicking] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Was heute dran ist</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">
          Training
        </h1>
      </div>


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
      ) : nextDay && activePlan && sessions.length === 0 ? (
        // Noch nie trainiert: der Plan kommt aus dem Startpaket, nicht aus
        // eigener Wahl — das sagt die Willkommenskarte und bietet den Wechsel
        // gleich an. Nach der ersten Einheit übernimmt die normale Karte.
        <WelcomeCard plan={activePlan} day={nextDay} />
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

          {/* Der Wechsel steht neben dem Start, nicht darunter: eine zweite
              Reihe hätte die Karte um eine Knopfhöhe wachsen lassen und die
              Wochenübersicht unter den Rand geschoben. „Anderer Tag" bleibt
              deshalb schmal — den Platz braucht der Startknopf.
              Über cn statt direkt über buttonVariants: nur so räumt
              tailwind-merge das bg-primary weg, sonst stünden beide Klassen da. */}
          <div className="flex gap-2 px-(--card-spacing)">
            <Link
              href={`/session?day=${encodeURIComponent(nextDay.id)}`}
              className={cn(buttonVariants({ size: "lg" }), "min-w-0 flex-1")}
            >
              <Play className="size-4" />
              Starten
            </Link>
            {activePlan.days.length > 1 && (
              <Button
                size="lg"
                onClick={() => setPicking(true)}
                className={cn(
                  "shrink-0 bg-current/10 text-current hover:bg-current/20"
                )}
              >
                <Shuffle className="size-4" />
                Anderer Tag
              </Button>
            )}
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
            <Link href="/plaene" className={buttonVariants({ size: "lg" })}>
              Zu den Plänen
            </Link>
          </div>
        </Card>
      )}

      <WeekCard
        sessions={sessions}
        exerciseById={exerciseById}
        weeklyTarget={weeklyTarget}
        weights={weights}
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Letzte Einheiten</h2>
          <Link
            href="/statistik"
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
                  <Link
                    href={`/einheit/${session.id}`}
                    className="flex items-center gap-3 px-(--card-spacing)"
                  >
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
                        {formatNumber(Math.round(volumeOf(session)))} kg
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
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {activePlan && (
        <DayPicker
          plan={activePlan}
          sessions={sessions}
          exerciseById={exerciseById}
          suggestedId={nextDay?.id ?? null}
          open={picking}
          onOpenChange={setPicking}
        />
      )}
    </div>
  );
}
