"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, History, MoreVertical, Pencil, Play, Plus, Timer, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { TrainingTabs } from "@/components/training/training-tabs";
import { EmomEditor } from "@/components/training/emom-editor";
import { EmomResultEditor } from "@/components/training/emom-result-editor";
import { EmomRunner } from "@/components/training/emom-runner";
import { createEmomTemplate, deleteEmomTemplate, fetchEmomTemplates } from "@/lib/api-emom";
import { deleteEmomResult, fetchEmomResults, saveEmomResult } from "@/lib/api-emom-results";
import {
  describeTemplate,
  EMOM_PRESETS,
  formatSeconds,
  workDuration,
  type EmomPreset,
  type EmomResult,
  type EmomTemplate,
} from "@/lib/emom";
import { formatDateLong } from "@/lib/format";
import { useSignalSound } from "@/lib/use-signal-sound";

export default function EmomPage() {
  const sound = useSignalSound();
  const [templates, setTemplates] = useState<EmomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<EmomTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EmomTemplate | null>(null);
  const [deleting, setDeleting] = useState<EmomTemplate | null>(null);
  const [picking, setPicking] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  const [results, setResults] = useState<EmomResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [deletingResult, setDeletingResult] = useState<EmomResult | null>(null);
  const [editingResult, setEditingResult] = useState<EmomResult | null>(null);
  const [resultEditorOpen, setResultEditorOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await fetchEmomTemplates());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konnte Vorlagen nicht laden");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      setResults(await fetchEmomResults());
    } catch {
      // Der Verlauf ist nicht kritisch für den Timer — bleibt still leer,
      // statt die Seite mit einem zweiten Fehlerblock zuzupflastern.
    } finally {
      setResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    load();
    loadResults();
  }, [load, loadResults]);

  async function handleDelete() {
    if (!deleting) return;
    const name = deleting.name;
    try {
      setTemplates(await deleteEmomTemplate(deleting.id));
      toast.success(`„${name}" gelöscht`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Vorlage nicht löschen");
    } finally {
      setDeleting(null);
    }
  }

  function openEditor(template: EmomTemplate | null) {
    setPicking(false);
    setEditing(template);
    setEditorOpen(true);
  }

  async function handlePreset(preset: EmomPreset) {
    setApplyingPreset(preset.presetId);
    try {
      setTemplates(
        await createEmomTemplate({
          name: preset.name,
          prepareSeconds: preset.prepareSeconds,
          rounds: preset.rounds,
          steps: preset.steps,
          restSeconds: preset.restSeconds,
        })
      );
      toast.success(`„${preset.name}" angelegt`);
      setPicking(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Vorlage nicht anlegen");
    } finally {
      setApplyingPreset(null);
    }
  }

  async function handleSaveResult(input: { roundsCompleted: number; note: string | null }) {
    if (!active) return;
    try {
      setResults(
        await saveEmomResult({
          templateName: active.name,
          roundsPlanned: active.rounds,
          roundsCompleted: input.roundsCompleted,
          note: input.note,
        })
      );
      toast.success("Ergebnis gespeichert");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Ergebnis nicht speichern");
    }
  }

  async function handleDeleteResult() {
    if (!deletingResult) return;
    try {
      setResults(await deleteEmomResult(deletingResult.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Ergebnis nicht löschen");
    } finally {
      setDeletingResult(null);
    }
  }

  async function handleDuplicate(template: EmomTemplate) {
    try {
      setTemplates(
        await createEmomTemplate({
          name: `${template.name} (Kopie)`,
          prepareSeconds: template.prepareSeconds,
          rounds: template.rounds,
          steps: template.steps,
          restSeconds: template.restSeconds,
        })
      );
      toast.success(`„${template.name}" dupliziert`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Vorlage nicht duplizieren");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Intervall-Timer für Runden auf Zeit</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">EMOM</h1>
      </div>

      <TrainingTabs />

      {active ? (
        <EmomRunner
          template={active}
          onClose={() => setActive(null)}
          onSaveResult={handleSaveResult}
          sound={sound}
        />
      ) : (
        <Card className="gap-3">
          <div className="px-(--card-spacing)">
            <p className="text-subheading font-display">Every Minute on the Minute</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Jede Runde startet nach einer festen Zeit — was du früher fertig hast, ist deine
              Pause. Wähle unten eine Vorlage und leg los.
            </p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="gap-1">
          <p className="px-(--card-spacing) text-sm font-medium">
            Vorlagen konnten nicht geladen werden
          </p>
          <p className="px-(--card-spacing) text-sm text-muted-foreground">{error}</p>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Deine Vorlagen</h2>
          <Button variant="ghost" size="sm" onClick={() => setPicking(true)}>
            <Plus />
            Neue Vorlage
          </Button>
        </div>

        {picking && (
          <Card className="gap-4">
            <div className="px-(--card-spacing)">
              <h3 className="text-subheading font-display">Vorlage wählen</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Übernimm ein fertiges EMOM oder starte leer — Übungen und Zeiten lassen sich
                danach frei anpassen.
              </p>
            </div>

            <div className="flex flex-col gap-2 px-(--card-spacing)">
              {EMOM_PRESETS.map((preset) => {
                // Nur ein Hinweis, keine Sperre: wer seine Cindy gelöscht hat
                // und sie zurückholt, soll das können — und zwei Fassungen
                // derselben Vorlage nebeneinander sind ein zulässiger Wunsch.
                // Ein zweites Mal aus Versehen tippt man aber leicht.
                const already = templates.some((t) => t.name === preset.name);
                return (
                  <button
                    key={preset.presetId}
                    type="button"
                    disabled={applyingPreset !== null}
                    onClick={() => handlePreset(preset)}
                    className="flex flex-col gap-1 rounded-panel bg-elevated p-4 text-left ring-1 ring-foreground/8 transition-colors hover:ring-foreground/25 disabled:opacity-50"
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium">{preset.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {describeTemplate({ ...preset, id: "preview", position: 0 })}
                      </span>
                      {already && (
                        <span className="rounded-pill bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                          schon angelegt
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 px-(--card-spacing)">
              <Button variant="outline" className="flex-1" onClick={() => openEditor(null)}>
                Oder leer starten
              </Button>
              <Button variant="ghost" onClick={() => setPicking(false)}>
                Abbrechen
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="h-24 animate-pulse rounded-card bg-card" />
        ) : templates.length === 0 ? (
          !picking && (
            <Card className="gap-4">
              <div className="px-(--card-spacing)">
                <p className="text-sm text-muted-foreground">
                  Noch keine Vorlage. Nimm ein fertiges EMOM oder leg selbst eines an — künftig
                  startest du es mit einem Tap.
                </p>
              </div>
              <div className="px-(--card-spacing)">
                <Button onClick={() => setPicking(true)}>
                  <Plus />
                  Erste Vorlage anlegen
                </Button>
              </div>
            </Card>
          )
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map((template) => (
              <Card key={template.id} size="sm" className="gap-0">
                <div className="flex items-center gap-3 px-(--card-spacing)">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-tile bg-elevated">
                    <Timer className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{template.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {describeTemplate(template)} · {formatSeconds(workDuration(template))} min
                    </p>
                  </div>
                  {/* Starten ist das, was hier fast immer gemeint ist, und
                      bleibt als einziger Knopf sichtbar. Bearbeiten,
                      Duplizieren und Löschen lagen vorher als drei 32-Pixel-
                      Ziele nebeneinander — am Daumen zu klein, und ausgerechnet
                      Löschen grenzte an Duplizieren. Sie stehen jetzt in einem
                      Menü, das für sich die vollen 44 Pixel bekommt; die
                      gewonnene Breite braucht ohnehin der Name. */}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      className="h-10"
                      onClick={() => {
                        // Muss aus diesem echten Tap heraus laufen — siehe
                        // Kommentar bei EmomRunners sound-Prop.
                        sound.unlock();
                        setActive(template);
                      }}
                      disabled={template.steps.length === 0}
                    >
                      <Play />
                      Start
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Aktionen für ${template.name}`}
                        className="flex size-11 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground aria-expanded:bg-foreground/5 aria-expanded:text-foreground"
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem onClick={() => openEditor(template)}>
                          <Pencil className="size-4" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="size-4" />
                          Duplizieren
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleting(template)}>
                          <Trash2 className="size-4" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {(resultsLoading || results.length > 0) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Verlauf</h2>

          {resultsLoading ? (
            <div className="h-16 animate-pulse rounded-card bg-card" />
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((result) => (
                <Card key={result.id} size="sm" className="gap-0">
                  <div className="flex items-center gap-3 px-(--card-spacing)">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-tile bg-elevated">
                      <History className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{result.templateName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateLong(result.date)} · {result.roundsCompleted} von{" "}
                        {result.roundsPlanned} {result.roundsPlanned === 1 ? "Runde" : "Runden"}
                        {result.note ? ` · ${result.note}` : ""}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Aktionen für das Ergebnis vom ${formatDateLong(result.date)}`}
                        className="flex size-11 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground aria-expanded:bg-foreground/5 aria-expanded:text-foreground"
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingResult(result);
                            setResultEditorOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingResult(result)}>
                          <Trash2 className="size-4" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <EmomEditor
        open={editorOpen}
        template={editing}
        onOpenChange={setEditorOpen}
        onSaved={setTemplates}
      />

      <EmomResultEditor
        open={resultEditorOpen}
        result={editingResult}
        onOpenChange={setResultEditorOpen}
        onSaved={setResults}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>&bdquo;{deleting?.name}&ldquo; löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Vorlage verschwindet aus der Liste. Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingResult}
        onOpenChange={(open) => !open && setDeletingResult(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ergebnis löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Verlaufseintrag verschwindet aus der Liste. Das lässt sich nicht rückgängig
              machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteResult}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
