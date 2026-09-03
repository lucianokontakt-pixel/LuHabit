"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { SessionSummary } from "@/components/training/session-summary";
import { ExercisePicker } from "@/components/training/exercise-picker";
import { SetRow, type SessionSet } from "@/components/training/set-row";
import { ExerciseThumb } from "@/components/training/exercise-media";
import { useTraining } from "@/lib/training-store";
import { useMetricData } from "@/lib/use-metric-data";
import { updateSession } from "@/lib/api-training";
import { summarizeSession } from "@/lib/session-stats";
import { incrementFor, setLabels, type Exercise, type WorkoutSession } from "@/lib/training";
import { todayISO } from "@/lib/datum";
import { formatDateLong } from "@/lib/format";
import { TITLE_CLASS } from "@/components/ui/page-title";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type EditableExercise = { exerciseId: string; sets: SessionSet[] };

/** Die gespeicherten Sätze in die Form bringen, in der sie bearbeitet werden. */
function toEditable(session: WorkoutSession): EditableExercise[] {
  const groups: EditableExercise[] = [];
  for (const set of [...session.sets].sort((a, b) => a.setIndex - b.setIndex)) {
    let group = groups.find((g) => g.exerciseId === set.exerciseId);
    if (!group) {
      group = { exerciseId: set.exerciseId, sets: [] };
      groups.push(group);
    }
    group.sets.push({
      weight: set.weight,
      reps: set.reps,
      done: set.done,
      warmup: set.warmup,
    });
  }
  return groups;
}

export function SessionDetail({ id }: { id: string }) {
  const router = useRouter();
  const { sessions, exerciseById, replaceSession, removeSession, restoreSession, loading } =
    useTraining();
  // Eigengewichtsübungen zählen mit dem Körpergewicht vom Tag der Einheit.
  const { entries: weights } = useMetricData("weight");

  const session = sessions.find((s) => s.id === id) ?? null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableExercise[]>([]);
  const [date, setDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [note, setNote] = useState("");
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const summary = useMemo(
    () => (session ? summarizeSession(session, sessions, exerciseById, weights) : null),
    [session, sessions, exerciseById, weights]
  );

  function startEditing() {
    if (!session) return;
    setDraft(toEditable(session));
    setDate(session.date);
    setDurationMinutes(
      session.durationSeconds ? String(Math.round(session.durationSeconds / 60)) : ""
    );
    setNote(session.note ?? "");
    setEditing(true);
  }

  function patchSet(exerciseIndex: number, setIndex: number, patch: Partial<SessionSet>) {
    setDraft((prev) =>
      prev.map((group, i) =>
        i === exerciseIndex
          ? { ...group, sets: group.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) }
          : group
      )
    );
  }

  async function handleSave() {
    if (!session) return;

    // Durchzählen über die ganze Einheit, nicht je Übung von vorn — sonst
    // schriebe das Nachbearbeiten die Reihenfolge wieder kaputt, die beim
    // Beenden richtig gesetzt wurde.
    let setIndex = 0;
    const sets = draft.flatMap((group) =>
      group.sets
        .map((set) => ({
          exerciseId: group.exerciseId,
          weight: set.weight,
          reps: set.reps,
          done: set.done,
          warmup: set.warmup,
        }))
        .filter((s) => s.done && s.reps > 0)
        .map((s) => ({ ...s, setIndex: setIndex++ }))
    );

    if (sets.length === 0) {
      toast.error("Mindestens ein abgehakter Satz muss übrig bleiben.");
      return;
    }

    const minutes = Number(durationMinutes.replace(",", "."));
    const durationSeconds =
      durationMinutes.trim() === "" || !Number.isFinite(minutes) || minutes <= 0
        ? null
        : Math.round(minutes * 60);

    setSaving(true);
    try {
      const saved = await updateSession({
        id: session.id,
        date,
        durationSeconds,
        note: note.trim() || null,
        sets,
      });
      replaceSession(saved);

      toast.success("Einheit gespeichert");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Einheit nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!session) return;
    // Die Einheit festhalten, bevor sie aus dem Bestand fällt — danach wäre sie
    // nirgends mehr greifbar, und das Rückgängig hätte nichts zurückzugeben.
    const geloescht = session;
    try {
      await removeSession(geloescht.id);
      toast.success("Einheit gelöscht", {
        duration: 8000,
        action: {
          label: "Rückgängig",
          onClick: () => {
            void restoreSession(geloescht)
              .then(() => router.push(`/einheit/${geloescht.id}`))
              .catch(() => toast.error("Konnte die Einheit nicht zurückholen"));
          },
        },
      });
      router.push("/statistik");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Einheit nicht löschen");
    }
  }

  if (loading) {
    return <Skeleton className="h-72" />;
  }

  if (!session || !summary) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-subheading">Einheit nicht gefunden</h1>
        <p className="text-sm text-muted-foreground">
          Sie wurde vermutlich gelöscht. Im Verlauf stehen alle Einheiten, die es noch gibt.
        </p>
        <Link
          href="/statistik"
          className={buttonVariants({ variant: "outline", className: "w-fit" })}
        >
          Zum Verlauf
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4 pb-6">
        <div>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Zurück
          </button>
          <h1 className={cn("mt-1", TITLE_CLASS)}>
            {session.dayName} bearbeiten
          </h1>
        </div>

        <Card className="gap-4">
          <div className="grid gap-3 px-(--card-spacing) sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-date" className="text-xs text-muted-foreground">
                Datum
              </Label>
              <Input
                id="session-date"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-duration" className="text-xs text-muted-foreground">
                Dauer (Minuten)
              </Label>
              <Input
                id="session-duration"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="leer = keine Dauer"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 px-(--card-spacing)">
            <Label htmlFor="session-note" className="text-xs text-muted-foreground">
              Notiz
            </Label>
            <Input
              id="session-note"
              value={note}
              placeholder="Wie lief es?"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {draft.map((group, exerciseIndex) => {
            const exercise = exerciseById[group.exerciseId];
            const step = exercise ? incrementFor(exercise) : 2.5;

            return (
              <Card key={`${group.exerciseId}-${exerciseIndex}`} className="gap-3">
                <div className="flex items-center gap-3 px-(--card-spacing)">
                  <ExerciseThumb
                    exercise={exercise ?? { id: group.exerciseId, name: "", media: null }}
                    className="size-16 shrink-0"
                  />
                  <p className="line-clamp-2 min-w-0 flex-1 text-body font-medium">
                    {exercise?.name ?? group.exerciseId}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${exercise?.name ?? group.exerciseId} aus der Einheit entfernen`}
                    onClick={() =>
                      setDraft((prev) => prev.filter((_, i) => i !== exerciseIndex))
                    }
                    className="shrink-0 hover:text-destructive"
                  >
                    <X />
                  </Button>
                </div>

                <div className="flex flex-col gap-2 px-(--card-spacing)">
                  {setLabels(group.sets).map((label, setIndex) => {
                    const set = group.sets[setIndex];
                    return (
                    <SetRow
                      key={setIndex}
                      index={setIndex}
                      label={label}
                      set={set}
                      weightStep={step}
                      onChange={(patch) => patchSet(exerciseIndex, setIndex, patch)}
                      onToggleDone={() =>
                        patchSet(exerciseIndex, setIndex, { done: !set.done })
                      }
                    />
                    );
                  })}
                </div>

                <div className="flex gap-2 px-(--card-spacing)">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft((prev) =>
                        prev.map((g, i) =>
                          i === exerciseIndex
                            ? {
                                ...g,
                                sets: [
                                  ...g.sets,
                                  {
                                    weight: g.sets[g.sets.length - 1]?.weight ?? 0,
                                    reps: g.sets[g.sets.length - 1]?.reps ?? 8,
                                    done: true,
                                    warmup: false,
                                  },
                                ],
                              }
                            : g
                        )
                      )
                    }
                  >
                    Satz hinzufügen
                  </Button>
                  {group.sets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDraft((prev) =>
                          prev.map((g, i) =>
                            i === exerciseIndex ? { ...g, sets: g.sets.slice(0, -1) } : g
                          )
                        )
                      }
                    >
                      Letzten entfernen
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <Button variant="outline" className="w-fit" onClick={() => setPicking(true)}>
          <Plus />
          Übung hinzufügen
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={handleSave} disabled={saving}>
            {saving ? "Speichert…" : "Speichern"}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setEditing(false)} disabled={saving}>
            Abbrechen
          </Button>
        </div>

        <ExercisePicker
          open={picking}
          onOpenChange={setPicking}
          excludeIds={draft.map((g) => g.exerciseId)}
          onPick={(exercise) => {
            setDraft((prev) => [
              ...prev,
              {
                exerciseId: exercise.id,
                sets: [{ weight: 0, reps: 8, done: true, warmup: false }],
              },
            ]);
            setPicking(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div>
        <Link
          href="/statistik"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Verlauf
        </Link>
      </div>

      <SessionSummary summary={summary} headline={session.dayName}>
        {session.note && <p className="text-sm text-muted-foreground">{session.note}</p>}
      </SessionSummary>

      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={startEditing}>
          <Pencil />
          Bearbeiten
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => setConfirmDelete(true)}
          className="hover:text-destructive"
        >
          <Trash2 />
          Löschen
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einheit löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {session.dayName} vom {formatDateLong(session.date)} wird mit allen Sätzen entfernt.
              Deine Progression rechnet danach ohne diese Einheit weiter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
