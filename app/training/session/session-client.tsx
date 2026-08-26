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
  PlayCircle,
  TrendingUp,
  TrendingDown,
  X,
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
import { SessionSummary } from "@/components/training/session-summary";
import { ExerciseDetail } from "@/components/training/exercise-media";
import { summarizeSession } from "@/lib/session-stats";
import { useTraining } from "@/lib/training-store";
import { useMetricData } from "@/lib/use-metric-data";
import { saveSession } from "@/lib/api-training";
import { addEntry } from "@/lib/api-client";
import { addDaysISO, isoDateDaysAgo, todayISO } from "@/lib/habits";
import { formatClock, formatDayLabel, formatNumber } from "@/lib/format";
import {
  computeTargets,
  effectiveLoad,
  expandTargets,
  incrementFor,
  measuredOn,
  setLabels,
  sessionVolume,
  suggestAdjustment,
  type PlanDay,
  type Exercise,
  type PlanExercise,
  type SetAdjustment,
  type SetTarget,
  type WorkoutPlan,
} from "@/lib/training";
import { deloadWeight, summarizeProgress } from "@/lib/progression";
import { needsWarmup, warmupWeight, WARMUP_REPS } from "@/lib/warmup";
import { useSignalSound } from "@/lib/use-signal-sound";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "luhabit-active-session";

type Draft = {
  dayId: string;
  startedAt: number;
  sets: Record<string, SessionSet[]>;
  /** Weggetippte Vorschläge — sonst stünden sie nach einem Reload wieder da. */
  dismissed?: string[];
};

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Speicher gesperrt — der Entwurf wird beim nächsten Start ohnehin überschrieben
  }
}

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

  const { plans, exerciseById, sessions, pendingIds, lastSetsFor, addSession, loading } =
    useTraining();
  const { entries: weightEntries, loading: weightLoading } = useMetricData("weight");
  const bodyweight = weightEntries[weightEntries.length - 1]?.value ?? null;

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SessionSet[]>>({});
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const { unlock: unlockSignalSound, play: playSignal } = useSignalSound();
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Gesetzt, sobald gespeichert wurde — dann zeigt die Seite den Abschluss. */
  const [finishedId, setFinishedId] = useState<string | null>(null);

  /**
   * Weggetippte Vorschläge, als "<planExerciseId>:<satzIndex>". Der Vorschlag
   * selbst ist reine Ableitung aus den Sätzen — nur das Wegtippen braucht
   * Gedächtnis.
   */
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
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
        /**
         * Ziel je Satz. Nach einer Einheit mit 8/9/10 Wiederholungen steht hier
         * auch 8/9/10 — nicht dreimal die Acht. Sonst zöge der Vorschlag jeden
         * Satz auf die Untergrenze zurück, und wer ihn abhakt, protokolliert
         * einen Rückschritt, der die Progression dauerhaft blockiert.
         */
        perSet: SetTarget[];
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
        perSet: result.targets,
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
      setDismissed(new Set(draft.dismissed ?? []));
    } else {
      const initial: Record<string, SessionSet[]> = {};
      day.exercises.forEach((pe, exerciseIndex) => {
        const target = targets[pe.id];
        const perSet = expandTargets(target?.perSet ?? [], pe.sets);
        const workingRows = Array.from({ length: pe.sets }, (_, i) => ({
          weight: perSet[i]?.weight ?? 0,
          reps: perSet[i]?.reps ?? pe.repMin,
          done: false,
          warmup: false,
        }));

        const exercise = exerciseById[pe.exerciseId];
        const firstWeight = workingRows[0]?.weight ?? 0;
        const wantsWarmup =
          exercise &&
          needsWarmup({ exercise, isFirst: exerciseIndex === 0, weight: firstWeight });
        const rampWeight = wantsWarmup
          ? warmupWeight(firstWeight, incrementFor(exercise, pe))
          : null;

        initial[pe.id] =
          rampWeight !== null
            ? [{ weight: rampWeight, reps: WARMUP_REPS, done: false, warmup: true }, ...workingRows]
            : workingRows;
      });
      setSetsByExercise(initial);
      setStartedAt(Date.now());
    }
    setActiveExercise(day.exercises[0]?.id ?? null);
  }, [day, loading, targets, weightLoading, exerciseById]);

  // Entwurf sichern, damit ein Reload im Gym nichts kostet.
  useEffect(() => {
    if (!day || !hydratedRef.current) return;
    try {
      const draft: Draft = {
        dayId: day.id,
        startedAt,
        sets: setsByExercise,
        dismissed: [...dismissed],
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Speicher voll oder gesperrt — die Einheit läuft trotzdem weiter
    }
  }, [day, setsByExercise, startedAt, dismissed]);

  useEffect(() => {
    // Nach dem Abschluss läuft keine Einheit mehr — die Uhr würde den
    // Abschlussbildschirm nur im Sekundentakt neu zeichnen.
    if (finishedId) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, finishedId]);

  const patchSet = useCallback(
    (planExerciseId: string, index: number, patch: Partial<SessionSet>) => {
      setSetsByExercise((prev) => {
        const list = prev[planExerciseId] ?? [];
        const current = list[index];
        if (!current) return prev;
        // Ein korrigiertes Gewicht gilt auch für die folgenden offenen Sätze —
        // wer im Gym nachjustiert, meint fast immer den Rest der Übung mit.
        // Abgehakte Sätze und die davor bleiben, wie sie protokolliert wurden,
        // und eine nachträgliche Korrektur an einem fertigen Satz zieht nichts
        // mit sich. Wiederholungen bleiben je Satz eigen (8/9/10).
        const carry = patch.weight !== undefined && !current.done;
        return {
          ...prev,
          [planExerciseId]: list.map((s, i) => {
            if (i === index) return { ...s, ...patch };
            // Nur unter Gleichartigen: eine korrigierte Aufwärmzeile zieht die
            // nächste Aufwärmzeile mit, nicht die Arbeitssätze — und umgekehrt.
            if (carry && i > index && !s.done && s.warmup === current.warmup) {
              return { ...s, weight: patch.weight! };
            }
            return s;
          }),
        };
      });
    },
    []
  );

  /**
   * Alle noch offenen Sätze der Übung auf ein neues Gewicht und die Untergrenze
   * stellen. Trägt sowohl den Deload als auch die Korrektur mitten in der
   * Einheit — abgehakte Sätze bleiben in beiden Fällen unangetastet.
   */
  const retargetOpenSets = useCallback(
    (planExerciseId: string, weight: number, reps: number) => {
      setSetsByExercise((prev) => ({
        ...prev,
        // Aufwärmzeilen bleiben außen vor: sie sollen leicht sein, und
        // suggestAdjustment zählt sie schon nicht zu den "restlichen Sätzen".
        [planExerciseId]: (prev[planExerciseId] ?? []).map((s) =>
          s.done || s.warmup ? s : { ...s, weight, reps }
        ),
      }));
    },
    []
  );

  const applySuggestion = useCallback(
    (planExerciseId: string, suggestion: SetAdjustment) => {
      if (suggestion.hasRemaining) {
        retargetOpenSets(planExerciseId, suggestion.nextWeight, suggestion.nextReps);
      } else {
        // Kein offener Satz mehr: statt einen fertigen Satz anzurühren, kommt
        // ein freiwilliger dazu.
        setSetsByExercise((prev) => ({
          ...prev,
          [planExerciseId]: [
            ...(prev[planExerciseId] ?? []),
            { weight: suggestion.nextWeight, reps: suggestion.nextReps, done: false, warmup: false },
          ],
        }));
      }
      setDismissed((prev) => new Set(prev).add(`${planExerciseId}:${suggestion.index}`));
    },
    [retargetOpenSets]
  );

  /**
   * Was der zuletzt abgehakte Satz jeder Übung nahelegt. Abgeleitet statt
   * gespeichert — so kann nichts mit dem wiederhergestellten Entwurf
   * auseinanderlaufen.
   */
  const suggestions = useMemo(() => {
    const map: Record<string, SetAdjustment | null> = {};
    for (const pe of day?.exercises ?? []) {
      // Ohne bekannten Gewichtssprung gibt es nichts zu raten — das passiert
      // nur, wenn die Übung aus der Bibliothek verschwunden ist.
      const step = targets[pe.id]?.step;
      map[pe.id] = step
        ? suggestAdjustment({
            sets: setsByExercise[pe.id] ?? [],
            repMin: pe.repMin,
            repMax: pe.repMax,
            increment: step,
          })
        : null;
    }
    return map;
  }, [day, setsByExercise, targets]);

  /** Reihenfolge der Übungen im Tag — Grundlage fürs Weiterschalten. */
  const order = useMemo(() => day?.exercises.map((pe) => pe.id) ?? [], [day]);
  const scrollTargetRef = useRef<string | null>(null);

  /**
   * Zur nächsten offenen Übung springen. Ab der letzten wird vorne
   * weitergesucht — übersprungene Übungen bleiben so erreichbar.
   */
  const advanceFrom = useCallback(
    (planExerciseId: string, state: Record<string, SessionSet[]>) => {
      const from = order.indexOf(planExerciseId);
      // Ein offener Aufwärmsatz allein macht eine Übung nicht "offen" — sonst
      // würde ans Ende durchgeschaltet werden, obwohl längst alles Wichtige
      // erledigt ist.
      const upcoming = [...order.slice(from + 1), ...order.slice(0, from)].find((id) =>
        (state[id] ?? []).some((s) => !s.done && !s.warmup)
      );
      scrollTargetRef.current = upcoming ?? null;
      setActiveExercise(upcoming ?? null);
    },
    [order]
  );

  const dismissSuggestion = useCallback(
    (planExerciseId: string, index: number) => {
      setDismissed((prev) => new Set(prev).add(`${planExerciseId}:${index}`));
      // Stand die Übung nur wegen des Vorschlags noch offen, geht es jetzt weiter.
      // Der Aufwärmsatz zählt dabei nicht mit — siehe advanceFrom.
      const working = (setsByExercise[planExerciseId] ?? []).filter((s) => !s.warmup);
      if (working.length > 0 && working.every((s) => s.done)) {
        advanceFrom(planExerciseId, setsByExercise);
      }
    },
    [advanceFrom, setsByExercise]
  );

  const toggleDone = useCallback(
    (pe: PlanExercise, index: number, step: number) => {
      const planExerciseId = pe.id;
      const restSeconds = pe.restSeconds;
      setSetsByExercise((prev) => {
        const list = prev[planExerciseId] ?? [];
        const current = list[index];
        if (!current) return prev;
        const nextDone = !current.done;

        const next = {
          ...prev,
          [planExerciseId]: list.map((s, i) => (i === index ? { ...s, done: nextDone } : s)),
        };

        if (nextDone && restSeconds > 0) {
          // Nach einem Aufwärmsatz reicht die halbe Pause — er ist keine
          // Belastung, auf die der Körper sich erholen müsste.
          const pause = current.warmup ? Math.max(45, Math.round(restSeconds / 2)) : restSeconds;
          setRestTotal(pause);
          setRestEndsAt(Date.now() + pause * 1000);
          // Muss aus diesem echten Tap heraus laufen — der Ton selbst kommt
          // erst am Ende der Pause, aber der AudioContext lässt sich nur
          // innerhalb einer Nutzergeste entsperren.
          unlockSignalSound();
        }
        if (nextDone && typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }

        // Übung fertig: die nächste offene klappt auf, ohne dass jemand mit
        // schwitzigen Händen zwei Karten antippen muss. Der Aufwärmsatz zählt
        // dabei nicht mit — er ist eine Empfehlung, kein Pflichtsatz.
        const workingNow = next[planExerciseId].filter((s) => !s.warmup);
        if (nextDone && workingNow.length > 0 && workingNow.every((s) => s.done)) {
          // Es sei denn, die Übung hat noch etwas zu sagen — etwa einen
          // Zusatzsatz, weil der letzte über der Obergrenze lag. Dann bliebe
          // das Angebot ungesehen, wenn die Karte sofort zuklappt.
          const pending = suggestAdjustment({
            sets: next[planExerciseId],
            repMin: pe.repMin,
            repMax: pe.repMax,
            increment: step,
          });
          if (!pending || dismissed.has(`${planExerciseId}:${pending.index}`)) {
            advanceFrom(planExerciseId, next);
          }
        }

        return next;
      });
    },
    [advanceFrom, dismissed, unlockSignalSound]
  );

  // Die frisch aufgeklappte Übung in den Blick holen — sonst steht man nach dem
  // letzten Satz vor einer eingeklappten Karte und scrollt selbst.
  useEffect(() => {
    const target = scrollTargetRef.current;
    if (!target || target !== activeExercise) return;
    scrollTargetRef.current = null;
    const node = document.querySelector(`[data-exercise="${target}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeExercise]);

  const completedSets = useMemo(
    () => Object.values(setsByExercise).flat().filter((s) => s.done),
    [setsByExercise]
  );
  const totalSets = useMemo(
    () => Object.values(setsByExercise).flat().length,
    [setsByExercise]
  );
  // Wie im Abschluss gerechnet: ohne Aufwärmsätze, mit dem Anteil des
  // Körpergewichts. Sonst stünde am Fuß der Einheit eine andere Zahl als
  // zwei Sekunden später auf dem Abschlussbildschirm.
  const volume = useMemo(() => {
    const onDay = measuredOn(sessionDate, weightEntries);
    let total = 0;
    for (const pe of day?.exercises ?? []) {
      const exercise = exerciseById[pe.exerciseId];
      for (const s of setsByExercise[pe.id] ?? []) {
        if (!s.done || s.warmup) continue;
        total += effectiveLoad(s, exercise, onDay) * s.reps;
      }
    }
    return total;
  }, [day, setsByExercise, exerciseById, sessionDate, weightEntries]);

  const finishedSummary = useMemo(() => {
    if (!finishedId) return null;
    const saved = sessions.find((s) => s.id === finishedId);
    return saved ? summarizeSession(saved, sessions, exerciseById, weightEntries) : null;
  }, [finishedId, sessions, exerciseById, weightEntries]);

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
            warmup: s.warmup,
          }))
          .filter((s) => s.done && s.reps > 0)
      );

      // elapsed wird im Sekundentakt fortgeschrieben — kein Date.now() im Render-Pfad.
      // Bei einer nachgetragenen Einheit misst die Uhr nur, wie lange das
      // Eintippen gedauert hat. Diese Zahl ist keine Trainingsdauer, also
      // bleibt sie leer, statt eine falsche zu erfinden.
      const durationSeconds = isSessionToday ? elapsed : null;
      const habitMinutes =
        durationSeconds !== null ? Math.max(1, Math.round(durationSeconds / 60)) : null;
      const payload = {
        planId: located.plan.id,
        dayId: day.id,
        dayName: day.name,
        date: sessionDate,
        durationSeconds,
        sets: payloadSets,
      };

      // saveSession legt die Einheit sofort im lokalen Bestand ab und reiht sie
      // zum Senden ein — sie geht erst tatsächlich raus, sobald Netz da ist,
      // ohne dass das hier zu einem Fehler wird. addSession bekommt das
      // vollständige, bereits gespeicherte Objekt direkt zurück, statt auf den
      // Reload zu warten, den die Warteschlange im Hintergrund anstößt.
      const saved = await saveSession(payload);
      addSession(saved);

      // Die Einheit zählt auch auf das Training-Habit im Dashboard ein — aber
      // nur mit einer echten Dauer. Nachgetragene Minuten trägst du auf der
      // Habit-Seite selbst nach, dort geht das inzwischen auch rückwirkend.
      if (habitMinutes !== null) {
        try {
          await addEntry({ habit: "training", date: sessionDate, delta: habitMinutes });
        } catch {
          // Das Habit kann gelöscht worden sein — die Einheit ist trotzdem gespeichert
        }
      }

      clearDraft();

      if (!isSessionToday) {
        toast.success(`${day.name} nachgetragen für ${formatDayLabel(sessionDate, today)}`);
      }
      // Statt zurück auf die Übersicht: der Abschluss der eigenen Einheit.
      // Was geschafft wurde, gehört an den Moment, in dem es geschafft wurde.
      setFinishedId(saved.id);
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte die Einheit nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  function handleAbort() {
    clearDraft();
    router.push("/training");
  }

  if (finishedSummary) {
    const waitingForNetwork = pendingIds.has(finishedSummary.session.id);
    return (
      <div className="flex flex-col gap-4">
        <SessionSummary summary={finishedSummary} hero>
          <p className="text-sm opacity-75">
            {waitingForNetwork
              ? "Gesichert auf dem Handy — sie wird gesendet, sobald du wieder Netz hast."
              : finishedSummary.volumeDelta === null
              ? "Der erste Durchgang dieses Tages — ab jetzt gibt es etwas zu schlagen."
              : finishedSummary.volumeDelta > 0
                ? "Mehr bewegt als beim letzten Mal."
                : finishedSummary.volumeDelta < 0
                  ? "Weniger Volumen als beim letzten Mal — auch das gehört dazu."
                  : "Exakt auf dem Stand der letzten Einheit."}
          </p>
        </SessionSummary>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/training"
            className={buttonVariants({ size: "lg", className: "flex-1 sm:flex-none" })}
          >
            Fertig
          </Link>
          {/* Eine wartende Einheit kennt der Server noch nicht — die
              Bearbeiten-Seite lädt sie über ihre ID und liefe ins Leere. */}
          {!waitingForNetwork && (
            <Link
              href={`/training/einheit/${finishedSummary.session.id}`}
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "flex-1 sm:flex-none",
              })}
            >
              Bearbeiten
            </Link>
          )}
        </div>
      </div>
    );
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
    <div className="flex flex-col gap-4 pb-32">
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
          {formatNumber(
            Math.round(
              sessionVolume(
                previousSession,
                exerciseById,
                measuredOn(previousSession.date, weightEntries)
              )
            )
          )}{" "}
          kg Volumen
        </p>
      )}

      <div className="flex flex-col gap-3">
        {day.exercises.map((pe, exerciseIndex) => {
          const exercise = exerciseById[pe.exerciseId];
          const sets = setsByExercise[pe.id] ?? [];
          const target = targets[pe.id];
          // Aufwärmsätze zählen hier nicht mit — sie sind eine Empfehlung,
          // kein Pflichtsatz. Sonst bliebe eine fertige Übung als "offen"
          // stehen, nur weil die Rampe ungetickt blieb.
          const workingRows = sets.filter((s) => !s.warmup);
          const doneCount = workingRows.filter((s) => s.done).length;
          const allDone = workingRows.length > 0 && doneCount === workingRows.length;
          const isActive = activeExercise === pe.id;
          const labels = setLabels(sets);
          const suggestion = suggestions[pe.id];
          const suggestionOpen =
            suggestion !== null &&
            suggestion !== undefined &&
            !dismissed.has(`${pe.id}:${suggestion.index}`);
          // Sobald ein Satz steht, reden die Hinweise aus der letzten Einheit
          // an der Gegenwart vorbei — dann zählt nur noch, was gerade war.
          const started = doneCount > 0;

          return (
            <Card
              key={pe.id}
              data-exercise={pe.id}
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
                    {workingRows.length} erledigt
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
                  {exercise?.media && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="mx-(--card-spacing) w-fit text-muted-foreground"
                      onClick={() => setDetail(exercise)}
                    >
                      <PlayCircle />
                      Bewegung ansehen
                    </Button>
                  )}

                  {suggestionOpen && (
                    <div className="mx-(--card-spacing) flex flex-wrap items-center gap-2 rounded-field bg-card px-3 py-2 text-xs">
                      {suggestion.direction === "up" ? (
                        <TrendingUp className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <TrendingDown className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 text-muted-foreground">
                        Satz {suggestion.index + 1}:{" "}
                        {suggestion.direction === "up"
                          ? `${suggestion.reps} statt ${suggestion.targetReps} Wdh — `
                          : `nur ${suggestion.reps} statt ${suggestion.targetReps} Wdh — `}
                        {/* Ohne Zusatzgewicht wandert das Wiederholungsziel,
                            sonst das Gewicht. */}
                        {suggestion.axis === "reps"
                          ? suggestion.hasRemaining
                            ? `restliche Sätze auf ${suggestion.nextReps} Wdh?`
                            : `noch einen Satz mit ${suggestion.nextReps} Wdh?`
                          : suggestion.hasRemaining
                            ? `restliche Sätze auf ${formatNumber(suggestion.nextWeight)} kg?`
                            : `noch einen Satz mit ${formatNumber(suggestion.nextWeight)} kg?`}
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => applySuggestion(pe.id, suggestion)}
                      >
                        {!suggestion.hasRemaining
                          ? "Satz anhängen"
                          : suggestion.direction === "up"
                            ? "Anheben"
                            : "Reduzieren"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Vorschlag ausblenden"
                        onClick={() => dismissSuggestion(pe.id, suggestion.index)}
                      >
                        <X />
                      </Button>
                    </div>
                  )}
                  {!started && target?.progressed && target.progressionKind === "weight" && (
                    <p className="mx-(--card-spacing) flex items-center gap-2 rounded-field bg-blush px-3 py-2 text-xs text-blush-foreground">
                      <TrendingUp className="size-3.5 shrink-0" />
                      Letztes Mal alle Sätze auf {pe.repMax} — Gewicht auf{" "}
                      {formatNumber(target.weight)} kg erhöht, zurück auf {pe.repMin} Wdh.
                    </p>
                  )}
                  {!started && target?.progressed && target.progressionKind === "reps" && (
                    <p className="mx-(--card-spacing) flex items-center gap-2 rounded-field bg-blush px-3 py-2 text-xs text-blush-foreground">
                      <TrendingUp className="size-3.5 shrink-0" />
                      Letztes Mal alles geschafft — neues Ziel: {target.reps} Wiederholungen.
                    </p>
                  )}
                  {!started && target?.stagnating && !target.progressed && (
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
                          onClick={() => retargetOpenSets(pe.id, target.deload!, pe.repMin)}
                        >
                          Deload
                        </Button>
                      )}
                    </div>
                  )}
                  {!started && target?.isFirstTime && (
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
                        label={labels[index]}
                        set={set}
                        weightStep={target?.step ?? 2.5}
                        onChange={(patch) => patchSet(pe.id, index, patch)}
                        onToggleDone={() => toggleDone(pe, index, target?.step ?? 2.5)}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 px-(--card-spacing)">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSetsByExercise((prev) => {
                          const list = prev[pe.id] ?? [];
                          // Ein zusätzlicher Satz erbt den vorherigen — das
                          // trifft es näher als das Ziel des ersten Satzes.
                          const previous = list[list.length - 1];
                          return {
                            ...prev,
                            [pe.id]: [
                              ...list,
                              {
                                weight: previous?.weight ?? target?.weight ?? 0,
                                reps: previous?.reps ?? target?.reps ?? pe.repMin,
                                done: false,
                                warmup: false,
                              },
                            ],
                          };
                        })
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
                // Verkürzen darf nie in die Vergangenheit laufen — dann ist die
                // Pause eben sofort vorbei, statt negativ weiterzuzählen.
                setRestTotal((t) => Math.max(1, t + seconds));
                setRestEndsAt((end) =>
                  Math.max(Date.now(), (end ?? Date.now()) + seconds * 1000)
                );
              }}
              onDismiss={() => setRestEndsAt(null)}
              onFinish={() => playSignal("finish")}
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

      <ExerciseDetail
        exercise={detail}
        onOpenChange={(open) => !open && setDetail(null)}
      />

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
