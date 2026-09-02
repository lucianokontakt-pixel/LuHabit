"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Flame,
  Lightbulb,
  Minus,
  TrendingUp,
  TrendingDown,
  Plus,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ExerciseDetail, ExerciseThumb } from "@/components/training/exercise-media";
import { ExercisePicker } from "@/components/training/exercise-picker";
import { summarizeSession } from "@/lib/session-stats";
import { useTraining } from "@/lib/training-store";
import { useMetricData } from "@/lib/use-metric-data";
import { saveSession, swapPlanExercise } from "@/lib/api-training";
import { addDaysISO, isoDateDaysAgo, todayISO } from "@/lib/datum";
import { newId } from "@/lib/ids";
import { formatClock, formatDayLabel, formatNumber } from "@/lib/format";
import {
  computeTargets,
  effectiveLoad,
  expandTargets,
  incrementFor,
  measuredOn,
  bestEffortLabel,
  formatLoggedSets,
  setLabels,
  sessionVolume,
  suggestAdjustment,
  type PlanDay,
  type Exercise,
  type PlanExercise,
  type ProgressionResult,
  type SetAdjustment,
  type SetTarget,
  type WorkoutPlan,
  type WorkoutSet,
} from "@/lib/training";
import { needsWarmup, warmupWeight, WARMUP_PERCENT, WARMUP_REPS } from "@/lib/warmup";
import { cn } from "@/lib/utils";
import { STATE_DONE, STATE_HINT } from "@/lib/tints";
import { DRAFT_KEY, uebungenDerEinheit } from "@/lib/session-draft";
import { TITLE_CLASS } from "@/components/ui/page-title";
import { Skeleton } from "@/components/ui/skeleton";


type Draft = {
  dayId: string;
  startedAt: number;
  sets: Record<string, SessionSet[]>;
  /** Weggetippte Vorschläge — sonst stünden sie nach einem Reload wieder da. */
  dismissed?: string[];
  /**
   * Übungen, die während der Einheit dazukamen. Sie stehen in keinem Plan, also
   * kennt sie nach einem Reload nur der Entwurf — ohne sie stünden ihre Sätze
   * verwaist im Speicher.
   */
  extras?: PlanExercise[];
  /**
   * Abweichungen vom Plan, die nur für heute gelten: null heißt ausgelassen,
   * eine Übung heißt dagegen getauscht. Ohne den Entwurf stünde die
   * ausgelassene Übung nach einem Reload wieder da.
   */
  ersatz?: Record<string, PlanExercise | null>;
  /** Läuft gerade eine Pause? Ein absoluter Zeitpunkt, damit sie weiterläuft. */
  restEndsAt?: number | null;
  restTotal?: number;
  note?: string;
};

/**
 * Was die Progression für eine Übung vorschlägt, aufbereitet für die Ansicht.
 * Eigene Funktion, weil zwei Wege hier hereinkommen: der Aufbau der Einheit und
 * eine Übung, die mitten drin dazukommt.
 */
type Target = {
  weight: number;
  reps: number;
  /**
   * Ziel je Satz. Nach einer Einheit mit 8/9/10 Wiederholungen steht hier auch
   * 8/9/10 — nicht dreimal die Acht. Sonst zöge der Vorschlag jeden Satz auf
   * die Untergrenze zurück, und wer ihn abhakt, protokolliert einen
   * Rückschritt, der die Progression dauerhaft blockiert.
   */
  perSet: SetTarget[];
  progressed: boolean;
  progressionKind: "weight" | "reps" | null;
  isFirstTime: boolean;
  step: number;
  /** Welche Regel den Vorschlag gemacht hat. */
  kind: ProgressionResult["kind"];
  /** Warum genau diese Zahlen — wird bei jeder Übung angezeigt. */
  why: string;
};

function targetFor(
  exercise: Exercise,
  planExercise: PlanExercise,
  history: WorkoutSet[][],
  bodyweight: number | null
): Target {
  const result = computeTargets({ exercise, planExercise, history, bodyweight });
  return {
    weight: result.targets[0]?.weight ?? 0,
    reps: result.targets[0]?.reps ?? planExercise.repMin,
    perSet: result.targets,
    progressed: result.progressed,
    progressionKind: result.progressionKind,
    isFirstTime: result.isFirstTime,
    step: incrementFor(exercise, planExercise),
    kind: result.kind,
    why: result.why,
  };
}

/**
 * Die Satzzeilen einer Übung beim Start: die Ziele der Progression, davor bei
 * Bedarf ein Aufwärmsatz.
 */
function buildRows({
  exercise,
  planExercise,
  target,
  isFirst,
}: {
  exercise: Exercise | undefined;
  planExercise: PlanExercise;
  target: Target | undefined;
  isFirst: boolean;
}): SessionSet[] {
  const rowCount = planExercise.sets;
  const perSet = expandTargets(target?.perSet ?? [], rowCount);
  const workingRows = Array.from({ length: rowCount }, (_, i) => ({
    weight: perSet[i]?.weight ?? 0,
    reps: perSet[i]?.reps ?? planExercise.repMin,
    done: false,
    warmup: false,
  }));

  const firstWeight = workingRows[0]?.weight ?? 0;
  const rampWeight =
    exercise && needsWarmup({ exercise, isFirst, weight: firstWeight })
      ? warmupWeight(firstWeight, incrementFor(exercise, planExercise))
      : null;

  return rampWeight !== null
    ? [{ weight: rampWeight, reps: WARMUP_REPS, done: false, warmup: true }, ...workingRows]
    : workingRows;
}

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

  const {
    plans,
    setPlans,
    exerciseById,
    sessions,
    pendingIds,
    historyFor,
    lastLoggedFor,
    addSession,
    loading,
  } = useTraining();
  const { entries: weightEntries, loading: weightLoading } = useMetricData("weight");
  const bodyweight = weightEntries[weightEntries.length - 1]?.value ?? null;

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SessionSet[]>>({});
  /** Übungen, die während der Einheit dazukamen — nur für heute. */
  const [extras, setExtras] = useState<PlanExercise[]>([]);
  /** Ausgelassen (null) oder getauscht — je Platz im Plan, nur für heute. */
  const [ersatz, setErsatz] = useState<Record<string, PlanExercise | null>>({});
  const [picking, setPicking] = useState(false);
  /** Für welchen Platz der Wähler gerade offen ist — null heißt: dazunehmen. */
  const [tauschFuer, setTauschFuer] = useState<string | null>(null);
  /** Was zu dieser Einheit zu sagen war. Ging bisher erst hinterher. */
  const [note, setNote] = useState("");
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);
  /** Nach einem Tausch: welche Übung wen ersetzt hat — offen, bis explizit
   *  entschieden ist, ob das auch im Plan gilt. */
  const [swapConfirm, setSwapConfirm] = useState<{ slotId: string; exercise: Exercise } | null>(
    null
  );
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

  /**
   * Die Übungen dieser einen Einheit: die des Plans — abzüglich des heute
   * Ausgelassenen, mit dem Getauschten an derselben Stelle — dahinter alles,
   * was spontan dazukam. Der Plan selbst bleibt unangetastet: was hier steht,
   * gilt für heute und sonst nirgends.
   */
  const exercises = useMemo(
    () => uebungenDerEinheit(day?.exercises ?? [], ersatz, extras),
    [day, ersatz, extras]
  );

  /**
   * Welche Übung auf welchem Platz des Plans steht. Bei einer getauschten sind
   * das zwei verschiedene IDs, und „auslassen" und „tauschen" meinen immer den
   * Platz — sonst ließe sich eine schon getauschte Übung nicht noch einmal
   * anfassen.
   */
  const slotVon = useMemo(() => {
    const map: Record<string, string> = {};
    for (const slot of day?.exercises ?? []) {
      const dafuer = ersatz[slot.id];
      if (dafuer === undefined) map[slot.id] = slot.id;
      else if (dafuer) map[dafuer.id] = slot.id;
    }
    return map;
  }, [day, ersatz]);

  /** Was heute ausgelassen wurde — für die Zeile zum Zurückholen. */
  const ausgelassen = useMemo(
    () =>
      (day?.exercises ?? []).filter(
        (pe) => pe.id in ersatz && ersatz[pe.id] === null
      ),
    [day, ersatz]
  );

  // Zielvorgaben aus der letzten Einheit — einmal pro geladener Übungsliste.
  const targets = useMemo(() => {
    const map: Record<string, Target> = {};
    for (const pe of exercises) {
      const exercise = exerciseById[pe.exerciseId];
      if (!exercise) continue;
      map[pe.id] = targetFor(exercise, pe, historyFor(pe.exerciseId), bodyweight);
    }
    return map;
  }, [exercises, exerciseById, historyFor, bodyweight]);

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
      setExtras(draft.extras ?? []);
      setErsatz(draft.ersatz ?? {});
      setNote(draft.note ?? "");
      // Eine abgelaufene Pause gehört nicht zurück — wer eine Stunde später
      // wiederkommt, soll keinen Timer auf 0 vorfinden.
      if (draft.restEndsAt && draft.restEndsAt > Date.now()) {
        setRestEndsAt(draft.restEndsAt);
        setRestTotal(draft.restTotal ?? 0);
      }
    } else {
      const initial: Record<string, SessionSet[]> = {};
      day.exercises.forEach((pe, exerciseIndex) => {
        initial[pe.id] = buildRows({
          exercise: exerciseById[pe.exerciseId],
          planExercise: pe,
          target: targets[pe.id],
          isFirst: exerciseIndex === 0,
        });
      });
      setSetsByExercise(initial);
      setStartedAt(Date.now());
    }
    // Die erste Übung, die auch wirklich dasteht: hat der Entwurf die erste des
    // Plans ausgelassen, zeigte day.exercises[0] sonst auf eine Karte, die es
    // nicht gibt.
    const sichtbar = uebungenDerEinheit(
      day.exercises,
      draft?.ersatz ?? {},
      draft?.extras ?? []
    );
    setActiveExercise(sichtbar[0]?.id ?? null);
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
        extras,
        ersatz,
        restEndsAt,
        restTotal,
        note,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Speicher voll oder gesperrt — die Einheit läuft trotzdem weiter
    }
  }, [
    day,
    setsByExercise,
    startedAt,
    dismissed,
    extras,
    ersatz,
    restEndsAt,
    restTotal,
    note,
  ]);

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
   * Alle noch offenen Sätze der Übung auf ein neues Gewicht und Ziel stellen —
   * die Korrektur mitten in der Einheit. Abgehakte Sätze bleiben unangetastet.
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
    for (const pe of exercises) {
      // Ohne bekannten Gewichtssprung gibt es nichts zu raten — das passiert
      // nur, wenn die Übung aus der Bibliothek verschwunden ist.
      const step = targets[pe.id]?.step;
      map[pe.id] = step
        ? suggestAdjustment({
            sets: setsByExercise[pe.id] ?? [],
            repMin: pe.repMin,
            repMax: pe.repMax,
            increment: step,
            // Wofür die Rampe gedacht war — nur damit kann eine Aufwärmzeile
            // überhaupt etwas über das Arbeitsgewicht sagen.
            warmupTarget: { percent: WARMUP_PERCENT, reps: WARMUP_REPS },
          })
        : null;
    }
    return map;
  }, [exercises, setsByExercise, targets]);

  /** Reihenfolge der Übungen im Tag — Grundlage fürs Weiterschalten. */
  const order = useMemo(() => exercises.map((pe) => pe.id), [exercises]);
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

  /**
   * Eine Übung mitten in der Einheit dazunehmen. Sie gilt nur für heute — im
   * Plan steht danach kein Wort mehr davon. Satzzahl und Wiederholungsbereich
   * sind dieselben Vorgaben, die auch der Plan-Editor einer frisch
   * hinzugefügten Übung gibt; Gewicht und Sätze kommen aus der Progression, die
   * die Übung ja aus früheren Einheiten kennen kann.
   */
  const addExercise = useCallback(
    (exercise: Exercise) => {
      const planExercise: PlanExercise = {
        id: newId("extra"),
        exerciseId: exercise.id,
        position: 999,
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSeconds: 120,
        increment: null,
        startWeight: null,
      };
      const target = targetFor(
        exercise,
        planExercise,
        historyFor(exercise.id),
        bodyweight
      );
      setExtras((prev) => [...prev, planExercise]);
      setSetsByExercise((prev) => ({
        ...prev,
        // Nie die erste Übung des Tages: die Rampe für den kalten Körper ist
        // längst gelaufen, wenn hier jemand etwas dazunimmt.
        [planExercise.id]: buildRows({ exercise, planExercise, target, isFirst: false }),
      }));
      setActiveExercise(planExercise.id);
      scrollTargetRef.current = planExercise.id;
    },
    [historyFor, bodyweight]
  );

  /** Wieder weg damit — die Sätze der Übung gehen mit. */
  const removeExercise = useCallback((planExerciseId: string) => {
    setExtras((prev) => prev.filter((pe) => pe.id !== planExerciseId));
    setSetsByExercise((prev) => {
      const next = { ...prev };
      delete next[planExerciseId];
      return next;
    });
    setActiveExercise((cur) => (cur === planExerciseId ? null : cur));
  }, []);

  /**
   * Eine geplante Übung heute auslassen. Gerät besetzt, Schulter zwickt — die
   * Übung fällt für diese Einheit weg, im Plan steht sie morgen wieder.
   *
   * Angeboten wird das nur, solange kein Arbeitssatz abgehakt ist; sonst
   * verlöre ein Tipp Protokolliertes. Zurückholen geht über die Zeile unter der
   * Liste, damit ein Fehltipp nicht bis zum Ende der Einheit bestehen bleibt.
   */
  const skipExercise = useCallback((slotId: string) => {
    setErsatz((prev) => ({ ...prev, [slotId]: null }));
    setSetsByExercise((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setActiveExercise((cur) => (cur === slotId ? null : cur));
  }, []);

  /**
   * Doch wieder mitmachen — der Platz kehrt an seine Stelle im Plan zurück.
   *
   * Die Satzzeilen müssen dabei neu gebaut werden: das Auslassen hat sie
   * weggeräumt, und der Aufbau beim Start läuft nur ein einziges Mal. Ohne das
   * stünde die Übung wieder da, aber ohne einen einzigen Satz.
   */
  const unskipExercise = useCallback(
    (slotId: string) => {
      const slot = day?.exercises.find((pe) => pe.id === slotId);
      const exercise = slot ? exerciseById[slot.exerciseId] : undefined;

      setErsatz((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });

      if (!slot || !exercise) return;
      const target = targetFor(exercise, slot, historyFor(slot.exerciseId), bodyweight);
      setSetsByExercise((prev) => ({
        ...prev,
        [slot.id]: buildRows({
          exercise,
          planExercise: slot,
          target,
          isFirst: day?.exercises[0]?.id === slotId,
        }),
      }));
    },
    [day, exerciseById, historyFor, bodyweight]
  );

  /**
   * Eine geplante Übung gegen eine andere tauschen.
   *
   * Der Ersatz erbt die Vorgabe des Platzes — Sätze, Wiederholungsbereich,
   * Pause. Getauscht wird die Bewegung, nicht die Programmierung. Nicht geerbt
   * werden `increment` und `startWeight`: die waren auf die alte Übung
   * eingestellt, und null heißt „nimm, was die Übung selbst mitbringt".
   */
  const swapExercise = useCallback(
    (slotId: string, exercise: Exercise) => {
      const slot = day?.exercises.find((pe) => pe.id === slotId);
      if (!slot) return;

      const planExercise: PlanExercise = {
        ...slot,
        id: newId("tausch"),
        exerciseId: exercise.id,
        increment: null,
        startWeight: null,
      };
      const target = targetFor(exercise, planExercise, historyFor(exercise.id), bodyweight);
      const isFirst = day?.exercises[0]?.id === slotId;

      setErsatz((prev) => ({ ...prev, [slotId]: planExercise }));
      setSetsByExercise((prev) => {
        const next = { ...prev };
        delete next[slotId];
        next[planExercise.id] = buildRows({ exercise, planExercise, target, isFirst });
        return next;
      });
      setActiveExercise(planExercise.id);
      scrollTargetRef.current = planExercise.id;
    },
    [day, historyFor, bodyweight]
  );

  /**
   * Denselben Tausch auch im Plan festschreiben — für alle künftigen
   * Einheiten, nicht nur für heute. Kommt aus der Nachfrage nach dem Tausch,
   * nie automatisch: wer nur heute kein Gerät frei hatte, soll den Plan nicht
   * ungefragt umgeräumt bekommen.
   */
  const persistSwapToPlan = useCallback(
    async (slotId: string, exercise: Exercise) => {
      if (!located) return;
      const { day: planDay } = located;
      const plans = await swapPlanExercise({
        dayId: planDay.id,
        planExerciseId: slotId,
        exerciseId: exercise.id,
      });
      setPlans(plans);
    },
    [located, setPlans]
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
    [advanceFrom, dismissed]
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

  /**
   * Gezählt wird, was der Plan verlangt. Aufwärmzeilen bleiben draußen — sie
   * sind eine Empfehlung, und eine übersprungene Rampe darf die Einheit nicht
   * unfertig aussehen lassen. Die Karten rechnen genauso, also stimmen Kopf und
   * Karte jetzt überein.
   */
  const allWorkingRows = useMemo(
    () => Object.values(setsByExercise).flat().filter((s) => !s.warmup),
    [setsByExercise]
  );
  const completedSets = allWorkingRows.filter((s) => s.done).length;
  const totalSets = allWorkingRows.length;
  const allDone = totalSets > 0 && completedSets === totalSets;

  /**
   * Einmal Bescheid sagen, wenn der letzte Satz steht — sonst scrollt man nach
   * dem letzten Haken suchend weiter. Kein Dialog: die Einheit ist nicht vorbei,
   * nur der Plan ist abgearbeitet, und wer noch etwas dranhängen will, soll
   * nicht erst etwas wegklicken müssen. Ein Haken wieder raus, und die Meldung
   * darf beim nächsten Mal erneut kommen.
   */
  const announcedRef = useRef(false);
  useEffect(() => {
    if (!allDone) {
      announcedRef.current = false;
      return;
    }
    if (announcedRef.current) return;
    announcedRef.current = true;
    toast.success("Alles erledigt — du kannst beenden.");
  }, [allDone]);
  // Wie im Abschluss gerechnet: ohne Aufwärmsätze, mit dem Anteil des
  // Körpergewichts. Sonst stünde am Fuß der Einheit eine andere Zahl als
  // zwei Sekunden später auf dem Abschlussbildschirm.
  const volume = useMemo(() => {
    const onDay = measuredOn(sessionDate, weightEntries);
    let total = 0;
    for (const pe of exercises) {
      const exercise = exerciseById[pe.exerciseId];
      for (const s of setsByExercise[pe.id] ?? []) {
        if (!s.done || s.warmup) continue;
        total += effectiveLoad(s, exercise, onDay) * s.reps;
      }
    }
    return total;
  }, [exercises, setsByExercise, exerciseById, sessionDate, weightEntries]);

  const finishedSummary = useMemo(() => {
    if (!finishedId) return null;
    const saved = sessions.find((s) => s.id === finishedId);
    return saved ? summarizeSession(saved, sessions, exerciseById, weightEntries) : null;
  }, [finishedId, sessions, exerciseById, weightEntries]);

  async function handleFinish() {
    if (!day || !located) return;
    if (completedSets === 0) {
      toast.error("Hak mindestens einen Satz ab, bevor du beendest.");
      return;
    }

    setSaving(true);
    try {
      // setIndex zählt über die ganze Einheit durch, nicht je Übung von vorn.
      // Vorher trugen bei fünf Übungen fünf Zeilen die 0, fünf die 1 — und weil
      // der Server nach set_index sortiert, war die Reihenfolge der Übungen
      // beim Wiederlesen die, die SQLite zufällig zurückgab, nicht die
      // trainierte. Innerhalb einer Übung bleibt die Folge ebenso richtig, weil
      // die Zahl monoton weiterläuft.
      let setIndex = 0;
      const payloadSets = exercises.flatMap((pe) =>
        (setsByExercise[pe.id] ?? [])
          .map((s) => ({
            exerciseId: pe.exerciseId,
            weight: s.weight,
            reps: s.reps,
            done: s.done,
            warmup: s.warmup,
          }))
          .filter((s) => s.done && s.reps > 0)
          .map((s) => ({ ...s, setIndex: setIndex++ }))
      );

      // elapsed wird im Sekundentakt fortgeschrieben — kein Date.now() im Render-Pfad.
      // Bei einer nachgetragenen Einheit misst die Uhr nur, wie lange das
      // Eintippen gedauert hat. Diese Zahl ist keine Trainingsdauer, also
      // bleibt sie leer, statt eine falsche zu erfinden.
      const durationSeconds = isSessionToday ? elapsed : null;
      const payload = {
        planId: located.plan.id,
        dayId: day.id,
        dayName: day.name,
        date: sessionDate,
        durationSeconds,
        note: note.trim() || null,
        sets: payloadSets,
      };

      // saveSession legt die Einheit sofort im lokalen Bestand ab und reiht sie
      // zum Senden ein — sie geht erst tatsächlich raus, sobald Netz da ist,
      // ohne dass das hier zu einem Fehler wird. addSession bekommt das
      // vollständige, bereits gespeicherte Objekt direkt zurück, statt auf den
      // Reload zu warten, den die Warteschlange im Hintergrund anstößt.
      const saved = await saveSession(payload);
      addSession(saved);

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
    router.push("/");
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
            href="/"
            className={buttonVariants({ size: "lg", className: "flex-1 sm:flex-none" })}
          >
            Fertig
          </Link>
          {/* Eine wartende Einheit kennt der Server noch nicht — die
              Bearbeiten-Seite lädt sie über ihre ID und liefe ins Leere. */}
          {!waitingForNetwork && (
            <Link
              href={`/einheit/${finishedSummary.session.id}`}
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
    return <Skeleton className="h-72" />;
  }

  if (!day || !located) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-subheading">Trainingstag nicht gefunden</h1>
        <p className="text-sm text-muted-foreground">
          Der Tag wurde vermutlich gelöscht oder umbenannt. Wähle im Training einen neuen Start.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
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
          <h1 className={cn("mt-1", TITLE_CLASS)}>{day.name}</h1>
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
            {allDone ? "alle Sätze erledigt" : `${completedSets}/${totalSets} Sätze`}
          </p>
        </div>
      </div>

      {/* Wie weit die Einheit ist, ohne dass man zwei Zahlen im Kopf teilen
          muss. Ohne Farbe: im Training heißt Mint „erledigt" und Orange „läuft
          gerade" — ein farbiger Balken hier oben würde in beides hineinreden,
          obwohl er nur zählt. */}
      <div className="h-1 overflow-hidden rounded-pill bg-foreground/10">
        <div
          className="h-full rounded-pill bg-foreground transition-[width] duration-300 ease-out"
          style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
        />
      </div>

      {/* Der ganze Trainingstag, nicht die einzelne Übung — die hat ihre eigene
          Zeile weiter unten. Deshalb steht hier der Tag und nicht „Letztes Mal",
          sonst behaupten zwei Zeilen dasselbe und meinen Verschiedenes. */}
      {previousSession && (
        <p className="text-xs text-muted-foreground">
          {/* „zuletzt: Gestern" statt „zuletzt am Gestern" — die Beschriftung
              ist mal ein Datum und mal ein Wort, ein Doppelpunkt trägt beides. */}
          Dieser Trainingstag zuletzt: {formatDayLabel(previousSession.date, today)} ·{" "}
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
        {exercises.map((pe, exerciseIndex) => {
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
          // Das Ergebnis vom letzten Mal bleibt dagegen stehen: es ist die
          // Marke, gegen die jeder einzelne Satz antritt, und wird nicht
          // falsch, nur weil einer davon schon steht.
          const lastLogged = lastLoggedFor(pe.exerciseId);
          const best = bestEffortLabel(historyFor(pe.exerciseId));
          const isExtra = extras.some((e) => e.id === pe.id);
          // Der Platz im Plan, auf dem diese Übung steht — bei einer
          // getauschten ein anderer als ihre eigene ID. Bei spontan
          // Dazugenommenem gibt es keinen.
          const slotId = slotVon[pe.id];

          return (
            <Card
              key={pe.id}
              data-exercise={pe.id}
              className={cn("gap-3", allDone && "opacity-70")}
              variant={isActive ? "float" : "default"}
            >
              <div className="flex items-center gap-3 px-(--card-spacing)">
                {/* Das Standbild bleibt an seinem Platz, offen wie geschlossen
                    — es sagt immer, welche Übung das ist, nicht nur die
                    Nummer. Ein eigener Knopf, getrennt vom Rest der Zeile:
                    hier tippt man für die Anleitung, daneben fürs Auf- und
                    Zuklappen. */}
                {exercise ? (
                  <button
                    type="button"
                    onClick={() => setDetail(exercise)}
                    aria-label={`${exercise.name} — Ausführung und Infos`}
                    className="relative shrink-0"
                  >
                    <ExerciseThumb exercise={exercise} />
                    {allDone && (
                      <span className="absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-tl-md bg-tint-mint text-tint-mint-ink">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-md text-sm font-medium",
                      allDone
                        ? STATE_DONE
                        : "bg-card text-muted-foreground"
                    )}
                  >
                    {allDone ? <Check className="size-4" /> : exerciseIndex + 1}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setActiveExercise(isActive ? null : pe.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 text-body font-medium">
                      {exercise?.name ?? pe.exerciseId}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {isExtra && "Zusatz · "}
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
              </div>

              {isActive && (
                <>
                  {/* Was war, und was das Beste war — die Anleitung samt
                      Bewegungsablauf öffnet jetzt das Bild oben in der Zeile,
                      diese Zahlen sind keine eigene Fläche mehr wert. */}
                  {(best || lastLogged) && (
                    <div className="mx-(--card-spacing) flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {best && (
                        <p>
                          Bestwert <span className="nums text-foreground">{best}</span>
                        </p>
                      )}
                      {lastLogged && (
                        <p>
                          Letztes Mal ({formatDayLabel(lastLogged.date, today)}):{" "}
                          <span className="nums text-foreground">
                            {formatLoggedSets(lastLogged.sets)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {suggestionOpen && (
                    <div className="mx-(--card-spacing) flex flex-wrap items-center gap-2 rounded-field bg-card px-3 py-2 text-xs">
                      {suggestion.direction === "up" ? (
                        <TrendingUp className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <TrendingDown className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 text-muted-foreground">
                        {/* Die Rampe redet nicht über sich selbst, sondern über
                            das Gewicht, das gleich dran ist. */}
                        {suggestion.warmup
                          ? `Aufwärmsatz: ${suggestion.reps} Wdh mit ${formatNumber(suggestion.weight)} kg — Arbeitssätze auf ${formatNumber(suggestion.nextWeight)} kg?`
                          : `Satz ${labels[suggestion.index] ?? suggestion.index + 1}: ${
                              suggestion.direction === "down"
                                ? `nur ${suggestion.reps} statt ${suggestion.targetReps} Wdh — `
                                : // Genau die Grenze getroffen: „20 statt 20 Wdh"
                                  // wäre keine Auskunft, sondern eine Zahl
                                  // zweimal.
                                  suggestion.reps === suggestion.targetReps
                                  ? `Obergrenze mit ${suggestion.reps} Wdh erreicht — `
                                  : `${suggestion.reps} statt ${suggestion.targetReps} Wdh — `
                            }${
                              // Ohne Zusatzgewicht wandert das
                              // Wiederholungsziel, sonst das Gewicht.
                              suggestion.axis === "reps"
                                ? suggestion.hasRemaining
                                  ? `restliche Sätze auf ${suggestion.nextReps} Wdh?`
                                  : `noch einen Satz mit ${suggestion.nextReps} Wdh?`
                                : suggestion.hasRemaining
                                  ? `restliche Sätze auf ${formatNumber(suggestion.nextWeight)} kg?`
                                  : `noch einen Satz mit ${formatNumber(suggestion.nextWeight)} kg?`
                            }`}
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
                  {/* Warum genau diese Zahlen. Steht bei jeder Übung, nicht nur
                      wenn etwas Besonderes passiert ist: ein Vorschlag, den man
                      nicht nachprüfen kann, ist einer, dem man aufhört zu
                      vertrauen. Sobald ein Satz steht, redet er an der
                      Gegenwart vorbei — dann zählt nur noch, was gerade war. */}
                  {!started && target && (
                    <p
                      className={cn(
                        "mx-(--card-spacing) flex items-center gap-2 rounded-field px-3 py-2 text-xs",
                        // Die App schlägt etwas vor — das ist ihre Leitfarbe,
                        // nicht das Mint des Erledigten und nicht das Orange
                        // des Jetzt.
                        target.kind === "up"
                          ? STATE_HINT
                          : "bg-card text-muted-foreground"
                      )}
                    >
                      {target.kind === "up" ? (
                        <TrendingUp className="size-3.5 shrink-0" />
                      ) : target.kind === "first" ? (
                        <Flame className="size-3.5 shrink-0" />
                      ) : (
                        <Lightbulb className="size-3.5 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">{target.why}</span>
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

                  {/* Satz hinzufügen/entfernen bleibt in der Zeile, weil es
                      am häufigsten gebraucht wird — als Icon-Paar statt als
                      zwei Wortpillen, die zusammen breiter waren als beide
                      Sätze auf dem Handy nebeneinander Platz hatten. Die
                      selteneren Wege (tauschen, auslassen, entfernen) sitzen
                      hinter einem Punktmenü, statt als eigene Pillen die
                      Zeile zu füllen. */}
                  <div className="flex items-center gap-2 px-(--card-spacing)">
                    <div className="flex items-center overflow-hidden rounded-pill bg-elevated ring-1 ring-foreground/8">
                      {/* Der Minus-Knopf rührt nur an, was noch offen ist.
                          Vorher prüfte er allein die Anzahl — ein Tipp daneben
                          löschte einen fertig protokollierten Satz, ohne
                          Nachfrage und ohne Rückweg, und der Entwurf schrieb
                          das sofort fest. Wer einen abgehakten Satz wirklich
                          loswerden will, hakt ihn erst wieder ab; diese Geste
                          ist gewollt und umkehrbar. */}
                      <button
                        type="button"
                        onClick={() =>
                          setSetsByExercise((prev) => ({
                            ...prev,
                            [pe.id]: (prev[pe.id] ?? []).slice(0, -1),
                          }))
                        }
                        disabled={sets.length <= 1 || Boolean(sets[sets.length - 1]?.done)}
                        aria-label={
                          sets[sets.length - 1]?.done
                            ? "Letzten Satz entfernen — erst abhaken rückgängig machen"
                            : "Letzten Satz entfernen"
                        }
                        className="flex h-8 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-25"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="px-1 text-[0.8rem] text-muted-foreground">Satz</span>
                      <button
                        type="button"
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
                        aria-label="Satz hinzufügen"
                        className="flex h-8 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>

                    {/* Auslassen/Tauschen nur solange nichts abgehakt ist:
                        sonst nähme ein Tipp Protokolliertes mit. Wer doch
                        wechseln will, hakt erst wieder ab. */}
                    {((slotId && doneCount === 0) || isExtra) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label="Weitere Aktionen für diese Übung"
                          className="touch-target ml-auto flex size-8 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                        >
                          <Ellipsis className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {slotId && doneCount === 0 && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTauschFuer(slotId);
                                  setPicking(true);
                                }}
                              >
                                <ArrowLeftRight />
                                Tauschen
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => skipExercise(slotId)}>
                                <SkipForward />
                                Auslassen
                              </DropdownMenuItem>
                            </>
                          )}
                          {isExtra && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => removeExercise(pe.id)}
                            >
                              <Trash2 />
                              Übung entfernen
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* Ausgelassenes bleibt sichtbar, statt spurlos zu verschwinden: ein
          Fehltipp soll nicht bis zum Ende der Einheit halten. */}
      {ausgelassen.length > 0 && (
        <div className="flex flex-col gap-1">
          {ausgelassen.map((pe) => (
            <div
              key={pe.id}
              className="flex items-center gap-2 px-1 text-xs text-muted-foreground"
            >
              <span className="min-w-0 flex-1 truncate">
                {exerciseById[pe.exerciseId]?.name ?? pe.exerciseId} — heute ausgelassen
              </span>
              <Button
                variant="ghost"
                size="xs"
                className="shrink-0"
                onClick={() => unskipExercise(pe.id)}
              >
                Zurückholen
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Was nicht im Plan steht, aber heute trotzdem drankommt. Der Plan
          bleibt davon unberührt — die Übung gilt für diese Einheit. */}
      <Button variant="outline" className="w-full" onClick={() => setPicking(true)}>
        <Plus />
        Übung hinzufügen
      </Button>

      {/* Die Notiz gehört dahin, wo sie entsteht: "Bank war besetzt", "Rücken
          zwickt". Bisher gab es das Feld nur nachträglich in der fertigen
          Einheit — also genau dann, wenn man es schon vergessen hat. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="einheit-notiz" className="text-xs text-muted-foreground">
          Notiz (optional)
        </Label>
        <Input
          id="einheit-notiz"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Wie lief’s?"
        />
      </div>

      {/* Pausentimer und Abschluss teilen sich einen Stapel, damit sie sich
          nicht gegenseitig überdecken. */}
      <div
        className="fixed inset-x-0 bottom-[var(--bottom-nav-space)] z-30 sm:bottom-0"
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

      {/* Ein Wähler für zwei Wege: dazunehmen, oder einen Platz im Plan
          ersetzen. tauschFuer sagt, welcher von beiden gemeint ist. */}
      <ExercisePicker
        open={picking}
        onOpenChange={(open) => {
          setPicking(open);
          if (!open) setTauschFuer(null);
        }}
        onPick={(exercise) => {
          if (tauschFuer) {
            const slotId = tauschFuer;
            swapExercise(slotId, exercise);
            // Der Tausch gilt sofort für heute. Ob er auch den Plan ändert,
            // ist eine eigene Entscheidung — die muss explizit fallen, nicht
            // per Toast, den man auch einfach wegwischen kann.
            setSwapConfirm({ slotId, exercise });
          } else {
            addExercise(exercise);
          }
          setTauschFuer(null);
        }}
        excludeIds={exercises.map((pe) => pe.exerciseId)}
        title={tauschFuer ? "Übung tauschen" : "Übung hinzufügen"}
        description={
          tauschFuer
            ? "Der Ersatz behält Satzzahl, Wiederholungen und Pause des Plans. Nur für heute — der Plan bleibt, wie er ist."
            : "Aus der Bibliothek wählen oder eine eigene Übung anlegen."
        }
        // Die Übung, die gerade auf dem Platz steht — nach einem früheren
        // Tausch ist das eine andere als die im Plan. `exercises` trägt den
        // aktuellen Stand, `day.exercises` den geplanten.
        alternativeTo={
          tauschFuer
            ? exerciseById[
                exercises.find((pe) => slotVon[pe.id] === tauschFuer)?.exerciseId ?? ""
              ] ?? null
            : null
        }
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

      {/* Erzwingt die Entscheidung, statt sie über einen wegwischbaren Toast
          anzubieten: der Tausch gilt schon für heute, offen ist nur noch, ob
          er auch für künftige Einheiten in diesem Plan gelten soll. */}
      <AlertDialog open={swapConfirm !== null} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auch im Plan übernehmen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{swapConfirm?.exercise.name}“ gilt für heute. Soll der Tausch auch für künftige
              Einheiten in diesem Plan gelten?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSwapConfirm(null)}>
              Nein, nur heute
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!swapConfirm) return;
                persistSwapToPlan(swapConfirm.slotId, swapConfirm.exercise)
                  .then(() => toast.success("Im Plan übernommen"))
                  .catch(() => toast.error("Konnte den Plan nicht aktualisieren"));
                setSwapConfirm(null);
              }}
            >
              Ja, im Plan übernehmen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
