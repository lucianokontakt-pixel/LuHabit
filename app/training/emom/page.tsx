"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Play, Plus, Timer, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { EmomRunner } from "@/components/training/emom-runner";
import { createEmomTemplate, deleteEmomTemplate, fetchEmomTemplates } from "@/lib/api-emom";
import { describeTemplate, formatSeconds, totalDuration, type EmomTemplate } from "@/lib/emom";

export default function EmomPage() {
  const [templates, setTemplates] = useState<EmomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<EmomTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EmomTemplate | null>(null);
  const [deleting, setDeleting] = useState<EmomTemplate | null>(null);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    load();
  }, [load]);

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
    setEditing(template);
    setEditorOpen(true);
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
    <div className="flex flex-col gap-7">
      <div>
        <p className="text-sm text-muted-foreground">Intervall-Timer für Runden auf Zeit</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">EMOM</h1>
      </div>

      <TrainingTabs />

      {active ? (
        <EmomRunner template={active} onClose={() => setActive(null)} />
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
          <Button variant="ghost" size="sm" onClick={() => openEditor(null)}>
            <Plus />
            Neue Vorlage
          </Button>
        </div>

        {loading ? (
          <div className="h-24 animate-pulse rounded-card bg-card" />
        ) : templates.length === 0 ? (
          <Card className="gap-4">
            <div className="px-(--card-spacing)">
              <p className="text-sm text-muted-foreground">
                Noch keine Vorlage. Ein klassisches EMOM sind 10 Runden à 60 Sekunden — leg es
                einmal an und starte es künftig mit einem Tap.
              </p>
            </div>
            <div className="px-(--card-spacing)">
              <Button onClick={() => openEditor(null)}>
                <Plus />
                Erste Vorlage anlegen
              </Button>
            </div>
          </Card>
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
                      {describeTemplate(template)} · {formatSeconds(totalDuration(template))} min
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditor(template)}
                      aria-label={`${template.name} bearbeiten`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDuplicate(template)}
                      aria-label={`${template.name} duplizieren`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleting(template)}
                      aria-label={`${template.name} löschen`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActive(template)}
                      disabled={template.steps.length === 0}
                    >
                      <Play />
                      Start
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <EmomEditor
        open={editorOpen}
        template={editing}
        onOpenChange={setEditorOpen}
        onSaved={setTemplates}
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
    </div>
  );
}
