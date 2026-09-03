"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as api from "@/lib/api-training";
import { subscribeLocalData } from "@/lib/local-events";
import { subscribeQueue } from "@/lib/write-queue";
import { workingSets } from "@/lib/training";
import { useUebungssprache } from "@/lib/uebungssprache";
import type { Exercise, WorkoutPlan, WorkoutSession, WorkoutSet } from "@/lib/training";

/** Eine Einheit aus Sicht einer einzelnen Übung. */
export type LoggedSession = { date: string; sets: WorkoutSet[] };

type TrainingContextValue = {
  exercises: Exercise[];
  exerciseById: Record<string, Exercise>;
  plans: WorkoutPlan[];
  activePlan: WorkoutPlan | null;
  sessions: WorkoutSession[];
  /** Einheiten, deren Speichern noch in der Warteschlange auf Netz wartet. */
  pendingIds: Set<string>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setPlans: (plans: WorkoutPlan[]) => void;
  addSession: (session: WorkoutSession) => void;
  replaceSession: (session: WorkoutSession) => void;
  removeSession: (id: string) => Promise<void>;
  /** Holt eine gelöschte Einheit unverändert zurück, mit ihrer alten Kennung. */
  restoreSession: (session: WorkoutSession) => Promise<void>;
  upsertExercise: (exercise: Exercise) => void;
  /** Jede Einheit mit dieser Übung — jüngste zuerst, mit Datum und allen Sätzen. */
  loggedFor: (exerciseId: string) => LoggedSession[];
  /** Die jüngste Einheit mit dieser Übung — Datum und Arbeitssätze. */
  lastLoggedFor: (exerciseId: string) => { date: string; sets: WorkoutSet[] } | null;
  /** Alle Einheiten mit dieser Übung, älteste zuerst — Basis der Progression. */
  historyFor: (exerciseId: string) => WorkoutSet[][];
};

const TrainingContext = createContext<TrainingContextValue | null>(null);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const reload = useCallback(async () => {
    // Nur der allererste Lauf zeigt den Ladezustand. Danach bleibt der alte
    // Bestand stehen, bis der neue da ist.
    //
    // Das war die Ursache eines Flackerns, das schwer zuzuordnen war, weil es
    // scheinbar wahllos auftrat: reload() hängt an subscribeLocalData und
    // läuft damit nicht nur beim Öffnen, sondern nach jedem eigenen
    // Schreibvorgang UND nach jedem Abgleich — und der Abgleich startet unter
    // anderem bei jeder Rückkehr zur App (siehe components/sync-runner.tsx).
    // Wer also kurz das Handy weglegte und zurückkam, sah für einen Moment
    // überall graue Platzhalter statt seiner Daten. Der lokale Bestand liegt
    // in IndexedDB und ist in Millisekunden da; ihn währenddessen zu
    // verstecken bringt nichts und kostet nur Ruhe.
    if (!loadedOnce.current) setLoading(true);
    setError(null);
    try {
      const [ex, pl, se] = await Promise.all([
        api.fetchExercises(),
        api.fetchPlans(),
        api.fetchSessions({ limit: 300 }),
      ]);
      setExercises(ex);
      setPlans(pl);
      setSessions(se);
      // Erst nach einem geglückten Lauf — scheitert der erste, soll der
      // nächste Versuch wieder laden dürfen statt stumm zu bleiben.
      loadedOnce.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trainingsdaten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    reload();
  }, [reload]);

  // Der lokale Bestand ist die Wahrheit — er ändert sich sowohl durch eigene
  // Schreibvorgänge (die App zeigt sie schon optimistisch, siehe addSession)
  // als auch durch einen Abgleich, der Änderungen von einem anderen Gerät
  // bringt. Ein Nachladen hier ist der gemeinsame Nenner für beide Fälle.
  useEffect(() => subscribeLocalData(reload), [reload]);

  // Welche Einheiten noch auf das Senden warten — für die Anzeige nach dem
  // Abschließen ("gesichert, wird gesendet, sobald du wieder Netz hast").
  useEffect(
    () =>
      subscribeQueue((targets) => {
        const ids = new Set<string>();
        for (const target of targets) {
          if (target.startsWith("sessions:")) ids.add(target.slice("sessions:".length));
        }
        setPendingIds(ids);
      }),
    []
  );

  /**
   * Die Übungen in der eingestellten Sprache.
   *
   * Die Umbenennung passiert hier und nicht an den drei Dutzend Stellen, die
   * einen Übungsnamen anzeigen: der Store ist die eine Stelle, an der aus dem
   * Katalog Anzeigedaten werden. `name` trägt danach den gewählten Namen,
   * `en` den jeweils anderen — die Suche findet damit weiter beide.
   *
   * Wer eine Übung bearbeitet, bekommt trotzdem den Katalognamen ins
   * Formular (siehe components/training/exercise-editor.tsx): sonst
   * schriebe ein Speichern die Übersetzung als eigenen Namen fest.
   */
  const [uebungssprache] = useUebungssprache();
  const uebersetzt = useMemo(
    () =>
      uebungssprache === "de"
        ? exercises
        : exercises.map((e) =>
            e.en && e.en !== e.name ? { ...e, name: e.en, en: e.name } : e
          ),
    [exercises, uebungssprache]
  );

  const exerciseById = useMemo(() => {
    const map: Record<string, Exercise> = {};
    for (const e of uebersetzt) map[e.id] = e;
    return map;
  }, [uebersetzt]);

  const activePlan = useMemo(
    () => plans.find((p) => p.isActive) ?? plans[0] ?? null,
    [plans]
  );

  const addSession = useCallback((session: WorkoutSession) => {
    // Einsortieren statt vorne anhängen: eine nachgetragene Einheit ist nicht
    // die neueste. loggedFor und damit die ganze Progression verlassen sich
    // darauf, dass die Liste absteigend nach Datum steht — genau wie das ORDER
    // BY der API. sort ist stabil, gleichdatierte Einheiten bleiben also in der
    // Reihenfolge, in der sie hinzukamen.
    setSessions((prev) => [session, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  /**
   * Eine bearbeitete Einheit an ihren Platz setzen. Das Datum kann sich beim
   * Bearbeiten geändert haben, deshalb wird danach wie in addSession sortiert —
   * loggedFor und die ganze Progression verlassen sich auf absteigende Daten.
   */
  const replaceSession = useCallback((session: WorkoutSession) => {
    setSessions((prev) =>
      prev
        .map((s) => (s.id === session.id ? session : s))
        .sort((a, b) => b.date.localeCompare(a.date))
    );
  }, []);

  const removeSession = useCallback(async (id: string) => {
    await api.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /**
   * Eine gelöschte Einheit unverändert zurückholen.
   *
   * Was gelöscht wurde, hält der Aufrufer selbst fest — er hat die Einheit
   * ohnehin in der Hand, wenn er den Papierkorb zeichnet. Der Store müsste sie
   * sonst aus dem Zustand herausfischen, während er ihn gerade ändert.
   */
  const restoreSession = useCallback(async (session: WorkoutSession) => {
    await api.restoreSession(session);
    // Wieder einsortieren wie addSession: absteigend nach Datum, darauf
    // verlassen sich loggedFor und die ganze Progression.
    setSessions((prev) =>
      [...prev.filter((s) => s.id !== session.id), session].sort((a, b) =>
        b.date.localeCompare(a.date)
      )
    );
  }, []);

  const upsertExercise = useCallback((exercise: Exercise) => {
    setExercises((prev) => {
      const without = prev.filter((e) => e.id !== exercise.id);
      return [...without, exercise].sort((a, b) => a.name.localeCompare(b.name, "de"));
    });
  }, []);

  /**
   * Der Verlauf einer Übung an einer Stelle: jede Einheit, in der sie
   * tatsächlich protokolliert wurde, jüngste zuerst, mit Datum und allen
   * Sätzen — Aufwärmzeilen und offene Sätze inklusive, denn wer davon was
   * braucht, entscheidet der Aufrufer. sessions ist absteigend nach Datum
   * sortiert, also ist die erste Einheit die jüngste.
   */
  const loggedFor = useCallback(
    (exerciseId: string): LoggedSession[] =>
      sessions
        .map((session) => ({
          date: session.date,
          sets: session.sets.filter((s) => s.exerciseId === exerciseId),
        }))
        .filter((entry) => entry.sets.some((s) => s.done && !s.warmup)),
    [sessions]
  );

  const lastLoggedFor = useCallback(
    (exerciseId: string) => {
      const latest = loggedFor(exerciseId)[0];
      // Aufwärmsätze bleiben außen vor: die Rampe ist keine Leistung, gegen
      // die man antritt.
      return latest ? { date: latest.date, sets: workingSets(latest.sets) } : null;
    },
    [loggedFor]
  );

  /**
   * Nur die Sätze, älteste Einheit zuerst. Die Progression leitet ihren
   * Vorschlag jedes Mal daraus ab, statt auf einen mitgeführten Zähler zu
   * bauen: so genügt eine Korrektur an einem alten Satz, damit die nächste
   * Vorgabe stimmt.
   */
  const historyFor = useCallback(
    (exerciseId: string) => loggedFor(exerciseId).map((entry) => entry.sets).reverse(),
    [loggedFor]
  );

  const value: TrainingContextValue = {
    exercises: uebersetzt,
    exerciseById,
    plans,
    activePlan,
    sessions,
    pendingIds,
    loading,
    error,
    reload,
    setPlans,
    addSession,
    replaceSession,
    removeSession,
    restoreSession,
    upsertExercise,
    loggedFor,
    lastLoggedFor,
    historyFor,
  };

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining() {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error("useTraining muss innerhalb von TrainingProvider genutzt werden");
  return ctx;
}
