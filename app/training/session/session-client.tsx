"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { RestTimer } from "@/components/training/rest-timer";
import { SetRow, type SessionSet } from "@/components/training/set-row";
import { useTraining } from "@/lib/training-store";
import { useMetricData } from "@/lib/use-metric-data";
import { saveSession } from "@/lib/api-training";
import { addEntry } from "@/lib/api-client";
import { addDaysISO, isoDateDaysAgo, todayISO } from "@/lib/habits";
import { formatClock, formatDayLabel, formatNumber } from "@/lib/format";
import {
  computeTargets,
  incrementFor,
  sessionVolume,
  type PlanDay,
  type WorkoutPlan,
} from "@/lib/training";
import { deloadWeight, summarizeProgress } from "@/lib/progression";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "luhabit-active-session";

type Draft = {
  dayId: string;
  startedAt: number;
  sets: Record<string, SessionSet[]>;
};

function readDraft(dayId: string): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    return draft.dayId === dayId ? draft : null;
  } catch {
    return null;
  }
}

export function SessionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayId = searchParams.get("day");

  const today = todayISO();
  /**
   * Auf welchen Tag die Einheit gebucht wird. Normalfall ist heute; wer eine
   * Einheit vergessen hat, trägt sie hier auf ihren Tag zurück. Weiter als
   * einen Monat zurück ergibt es nicht — so weit rekonstruiert niemand Sätze.
   */
  const [sessionDate, setSessionDate] = useState(today);
  const earliestSessionDate = isoDateDaysAgo(30);
  const isSessionToday = sessionDate === today;

  const { plans, exerciseById, sessions, lastSetsFor, addSession, loading } = useTraining();
  const { entries: weightEntries, loading: weightLoading } = useMetricData("weight");
  const bodyweight = weightEntries[weightEntries.length - 1]?.value ?? null;

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SessionSet[]>>({});
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [saving, setSaving] = useState(false);
  const hydratedRef = useRef(false);

  const located = useMemo(() => {
    for (const plan of plans) {
      const day = plan.days.find((d) => d.id === dayId);
      if (day) return { plan, day } as { plan: WorkoutPlan; day: PlanDay };
    }
    return null;
  }, [plans, dayId]);

  const day = located?.day ?? null;

  // Zielvorgaben aus der letzten Einheit — einmal pro geladener Übungsliste.
  const targets = useMemo(() => {
    if (!day) return {};
    const map: Record<
      string,
      {
        weight: number;
        reps: number;
        progressed: boolean;
        progressionKind: "weight" | "reps" | null;
        isFirstTime: boolean;
        step: number;
        stagnating: boolean;
        sessionsSinceGain: number;
        deload: number | null;
      }
    > = {};
    for (const pe of day.exercises) {
      const exercise = exerciseById[pe.exerciseId];
      if (!exercise) continue;
      const result = computeTargets({
        exercise,
        planExercise: pe,
        lastSets: lastSetsFor(pe.exerciseId),
        bodyweight,
      });
      const summary = summarizeProgress(exercise, sessions);
      map[pe.id] = {
        weight: result.targets[0]?.weight ?? 0,
        reps: result.targets[0]?.reps ?? pe.repMin,
        progressed: result.progressed,
        progressionKind: result.progressionKind,
        isFirstTime: result.isFirstTime,
        step: incrementFor(exercise, pe),
        stagnating: summary.stagnating,
        sessionsSinceGain: summary.sessionsSinceGain,
        // Ein Deload ergibt nur Sinn, wo es überhaupt Gewicht gibt.
        deload:
          summary.stagnating && !summary.repsBased && summary.current > 0
            ? deloadWeight(summary.current, exercise, pe)
            : null,
      };
    }
    return map;
  }, [day, exerciseById, lastSetsFor, bodyweight, sessions]);

  // Startzustand: entweder ein unterbrochener Entwurf oder frische Zielwerte.
  useEffect(() => {
    if (hydratedRef.current || !day || loading) return;
    // Erst starten, wenn auch das Körpergewicht da ist — sonst wären die
    // Startgewichte auf 0 eingefroren, während der Kopf schon 40 kg vorschlägt.
    if (weightLoading) return;
    if (Object.keys(targets).length !== day.exercises.length) return;

    hydratedRef.current = true;
    const draft = readDraft(day.id);
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- stellt eine unterbrochene Einheit einmalig wieder her
      setSetsByExercise(draft.sets);
      setStartedAt(draft.startedAt);
    } else {
      const initial: Record<string, SessionSet[]> = {};
      for (const pe of day.exercises) {
        const target = targets[pe.id];
        initial[pe.id] = Array.from({ length: pe.sets }, () => ({
          weight: target?.weight ?? 0,
          reps: target?.reps ?? pe.repMin,
          done: false,
        }));
      }
      setSetsByExercise(initial);
      setStartedAt(Date.now());
    }
    setActiveExercise(day.exercises[0]?.id ?? null);
  }, [day, loading, targets, weightLoading]);

  // Entwurf sichern, damit ein Reload im Gym nichts kostet.
  useEffect(() => {
    if (!day || !hydratedRef.current) return;
    try {
      const draft: Draft = { dayId: day.id, startedAt, sets: setsByExercise };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Speicher voll oder gesperrt — die Einheit läuft trotzdem weiter
    }
  }, [day, setsByExercise, startedAt]);

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const patchSet = useCallback(
    (planExerciseId: string, index: number, patch: Partial<SessionSet>) => {
      setSetsByExercise((prev) => {
        const list = prev[planExerciseId] ?? [];
        return {
          ...prev,
          [planExerciseId]: list.map((s, i) => (i === index ? { ...s, ...patch } : s)),
        };
      });
    },
    []
  );

  /** Alle Sätze der Übung auf das reduzierte Gewicht und die Untergrenze setzen. */
  const applyDeload = useCallback(
    (planExerciseId: string, weight: number, reps: number) => {
      setSetsByExercise((prev) => ({
        ...prev,
        [planExerciseId]: (prev[planExerciseId] ?? []).map((s) =>
          s.done ? s : { ...s, weight, reps }
        ),
      }));
    },
    []
  );

  const toggleDone = useCallback(
    (planExerciseId: string, index: number, restSeconds: number) => {
      setSetsByExercise((prev) => {
        const list = prev[planExerciseId] ?? [];
        const current = list[index];
        if (!current) return prev;
        const nextDone = !current.done;

        if (nextDone && restSeconds > 0) {
          setRestTotal(restSeconds);
          setRestEndsAt(Date.now() + restSeconds * 1000);
        }
        if (nextDone && typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }

        return {
          ...prev,
          [planExerciseId]: list.map((s, i) => (i === index ? { ...s, done: nextDone } : s)),
        };
      });
    },
    []
  );

  const completedSets = useMemo(
    () => Object.values(setsByExercise).flat().filter((s) => s.done),
    [setsByExercise]
  );
  const totalSets = useMemo(
    () => Object.values(setsByExercise).flat().length,
    [setsByExercise]
  );
  const volume = completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  async function handleFinish() {
    if (!day || !located) return;
    if (completedSets.length === 0) {
      toast.error("Hak mindestens einen Satz ab, bevor du beendest.");
      return;
    }

    setSaving(true);
    try {
      const payloadSets = day.exercises.flatMap((pe) =>
        (setsByExercise[pe.id] ?? [])
          .map((s, i) => ({
            exerciseId: pe.exerciseId,
            setIndex: i,
            weight: s.weight,
            reps: s.reps,
            done: s.done,
          }))
          .filter((s) => s.done && s.reps > 0)
      );

      // elapsed wird im Sekundentakt fortgeschrieben — kein Date.now() im Render-Pfad.
      // Bei einer nachgetragenen Einheit misst die Uhr nur, wie lange das
      // Eintippen gedauert hat. Diese Zahl ist keine Trainingsdauer, also
      // bleibt sie leer, statt eine falsche zu erfinden.
      const durationSeconds = isSessionToday ? elapsed : null;
      const saved = await saveSession({
        planId: located.plan.id,
        dayId: day.id,
        dayName: day.name,
        date: sessionDate,
        durationSeconds,
        sets: payloadSets,
      });

      addSession({
        id: saved.id,
        planId: located.plan.id,
        dayId: day.id,
        dayName: day.name,
        date: saved.date,
        durationSeconds,
        note: null,
        sets: payloadSets.map((s, i) => ({
          id: `local-${i}`,
          exerciseId: s.exerciseId,
          setIndex: s.setIndex,
          weight: s.weight,
          reps: s.reps,
          done: true,
        })),
      });

      // Die Einheit zählt auch auf das Training-Habit im Dashboard ein — aber
      // nur mit einer echten Dauer. Nachgetragene Minuten trägst du auf der
      // Habit-Seite selbst nach, dort geht das inzwischen auch rückwirkend.
      if (durationSeconds !== null) {
        try {
          await addEntry({
            habit: "training",
            date: sessionDate,
            delta: Math.max(1, Math.round(durationSeconds / 60)),
          });
        } catch {
          // Das Habit kann gelöscht worden sein — die Einheit ist trotzdem gespeichert
        }
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // egal
      }

      const satzWort = completedSets.length === 1 ? "Satz" : "Sätze";
      toast.success(
        isSessionToday
          ? `${day.name} gespeichert — ${completedSets.length} ${satzWort}, ${formatNumber(
              Math.round(volume)
            )} kg`
          : `${day.name} nachgetragen für ${formatDayLabel(sessionDate, today)} — ${
              completedSets.length
            } ${satzWort}, ${formatNumber(Math.round(volume))} kg`
      );
      router.push("/training");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte die Einheit nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  function handleAbort() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // egal
    }
    router.push("/training");
  }

  if (loading) {
    return <div className="h-72 animate-pulse rounded-card bg-card" />;
  }

  if (!day || !located) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-subheading">Trainingstag nicht gefunden</h1>
        <p className="text-sm text-muted-foreground">
          Der Tag wurde vermutlich gelöscht oder umbenannt. Wähle im Training einen neuen Start.
        </p>
        <Link href="/training" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
          Zurück zum Training
        </Link>
      </div>
    );
  }

  const previousSession = sessions.find((s) => s.dayId === day.id);

  return (
    <div className="flex flex-col gap-5 pb-40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setConfirmAbort(true)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Abbrechen
          </button>
          <h1 className="mt-1 font-display text-4xl leading-tight tracking-tight">{day.name}</h1>
          <p className="text-sm text-muted-foreground">{located.plan.name}</p>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Einheit vom</span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Einen Tag zurück"
              disabled={sessionDate <= earliestSessionDate}
              onClick={() => setSessionDate((d) => addDaysISO(d, -1))}
            >
              <ChevronLeft />
            </Button>
            <span
              className={cn(
                "min-w-[6rem] text-center text-xs nums",
                isSessionToday ? "text-muted-foreground" : "font-medium text-foreground"
              )}
            >
              {formatDayLabel(sessionDate, today)}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Einen Tag vor"
              disabled={isSessionToday}
              onClick={() => setSessionDate((d) => addDaysISO(d, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="nums text-heading-sm leading-none">{formatClock(elapsed)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedSets.length}/{totalSets} Sätze
          </p>
        </div>
      </div>

      {previousSession && (
        <p className="text-xs text-muted-foreground">
          Letztes Mal: {previousSession.date} ·{" "}
          {formatNumber(Math.round(sessionVolume(previousSession)))} kg Volumen
        </p>
      )}

      <div className="flex flex-col gap-3">
        {day.exercises.map((pe, exerciseIndex) => {
          const exercise = exerciseById[pe.exerciseId];
          const sets = setsByExercise[pe.id] ?? [];
          const target = targets[pe.id];
          const doneCount = sets.filter((s) => s.done).length;
          const allDone = sets.length > 0 && doneCount === sets.length;
          const isActive = activeExercise === pe.id;

          return (
            <Card
              key={pe.id}
              className={cn("gap-3", allDone && "opacity-70")}
              variant={isActive ? "float" : "default"}
            >
              <button
                type="button"
                onClick={() => setActiveExercise(isActive ? null : pe.id)}
                className="flex items-center gap-3 px-(--card-spacing) text-left"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-tile text-sm font-medium",
                    allDone
                      ? "bg-blush text-blush-foreground"
                      : "bg-card text-muted-foreground"
                  )}
                >
                  {allDone ? <Check className="size-4" /> : exerciseIndex + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">
                    {exercise?.name ?? pe.exerciseId}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {pe.sets} × {pe.repMin}–{pe.repMax}
                    {target ? ` · ${formatNumber(target.weight)} kg` : ""} · {doneCount}/
                    {sets.length} erledigt
                  </span>
                </span>

                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    isActive && "rotate-90"
                  )}
                />
              </button>

              {isActive && (
                <>
                  {target?.progressed && target.progressionKind === "weight" && (
                    <p className="mx-(--card-spacing) flex items-center gap-2 rounded-field bg-blush px-3 py-2 text-xs text-blush-foreground">
                      <TrendingUp className="size-3.5 shrink-0" />
                      Letztes Mal alle Sätze auf {pe.repMax} — Gewicht auf{" "}
                      {formatNumber(target.weight)} kg erhöht, zurück auf {pe.repMin} Wdh.
                    </p>
                  )}
                  {target?.progressed && target.progressionKind === "reps" && (
                    <p className="mx-(--card-spacing) flex items-center gap-2 rounded-field bg-blush px-3 py-2 text-xs text-blush-foreground">
                      <TrendingUp className="size-3.5 shrink-0" />
                      Letztes Mal alles geschafft — neues Ziel: {target.reps} Wiederholungen.
                    </p>
                  )}
                  {target?.stagnating && !target.progressed && (
                    <div className="mx-(--card-spacing) flex flex-wrap items-center gap-2 rounded-field bg-card px-3 py-2 text-xs">
                      <TrendingDown className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 text-muted-foreground">
                        Seit {target.sessionsSinceGain} Einheiten kein Fortschritt.
                        {target.deload !== null
                          ? ` Einmal auf ${formatNumber(target.deload)} kg zurückgehen?`
                          : ""}
                      </span>
                      {target.deload !== null && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => applyDeload(pe.id, target.deload!, pe.repMin)}
                        >
                          Deload
                        </Button>
                      )}
                    </div>
                  )}
                  {target?.isFirstTime && (
                    <p className="mx-(--card-spacing) flex items-center gap-2 rounded-field bg-card px-3 py-2 text-xs text-muted-foreground">
                      <Flame className="size-3.5 shrink-0" />
                      {target.weight > 0
                        ? `Vorschlag aus deinem Körpergewicht — passe ihn an, wenn er nicht passt.`
                        : `Trag ein, womit du startest — beim nächsten Mal rechnet die App weiter.`}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 px-(--card-spacing)">
                    {sets.map((set, index) => (
                      <SetRow
                        key={index}
                        index={index}
                        set={set}
                        weightStep={target?.step ?? 2.5}
                        onChange={(patch) => patchSet(pe.id, index, patch)}
                        onToggleDone={() => toggleDone(pe.id, index, pe.restSeconds)}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 px-(--card-spacing)">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSetsByExercise((prev) => ({
                          ...prev,
                          [pe.id]: [
                            ...(prev[pe.id] ?? []),
                            {
                              weight: target?.weight ?? 0,
                              reps: target?.reps ?? pe.repMin,
                              done: false,
                            },
                          ],
                        }))
                      }
                    >
                      Satz hinzufügen
                    </Button>
                    {sets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSetsByExercise((prev) => ({
                            ...prev,
                            [pe.id]: (prev[pe.id] ?? []).slice(0, -1),
                          }))
                        }
                      >
                        Letzten entfernen
                      </Button>
                    )}
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* Pausentimer und Abschluss teilen sich einen Stapel, damit sie sich
          nicht gegenseitig überdecken. */}
      <div
        className="fixed inset-x-0 bottom-[var(--nav-offset)] z-30 sm:bottom-0"
        style={{ ["--nav-offset" as string]: "calc(68px + env(safe-area-inset-bottom))" }}
      >
        {restEndsAt !== null && (
          <div className="mx-auto max-w-4xl px-4 pb-2 sm:px-6">
            <RestTimer
              endsAt={restEndsAt}
              total={restTotal}
              onExtend={(seconds) => {
                setRestTotal((t) => t + seconds);
                setRestEndsAt((end) => (end ?? Date.now()) + seconds * 1000);
              }}
              onDismiss={() => setRestEndsAt(null)}
            />
          </div>
        )}

        <div className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div>
              <p className="nums text-sm">{formatNumber(Math.round(volume))} kg</p>
              <p className="text-xs text-muted-foreground">Volumen bisher</p>
            </div>
            <Button size="lg" onClick={handleFinish} disabled={saving}>
              <Check />
              {saving ? "Speichert…" : "Training beenden"}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmAbort} onOpenChange={setConfirmAbort}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Training abbrechen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die abgehakten Sätze dieser Einheit werden verworfen und nicht gespeichert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weitertrainieren</AlertDialogCancel>
            <AlertDialogAction onClick={handleAbort}>Abbrechen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
