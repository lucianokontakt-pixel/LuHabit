"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Check, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useTraining } from "@/lib/training-store";
import { createPlan, deletePlan, updatePlan } from "@/lib/api-training";
import { SPLIT_TEMPLATES, type SplitTemplate } from "@/lib/exercise-seed";
import { WEEKDAY_NAMES } from "@/lib/training";

export default function PlansPage() {
  const { plans, setPlans, loading } = useTraining();
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : failure);
    } finally {
      setBusy(false);
    }
  }

  const handleCreate = () =>
    run(async () => {
      const name = newName.trim();
      if (!name) return;
      const { plans: next } = await createPlan({ name, days: [] });
      setPlans(next);
      setNewName("");
      setCreating(false);
      toast.success(`„${name}“ angelegt`);
    }, "Konnte Plan nicht anlegen");

  const handleTemplate = (template: SplitTemplate) =>
    run(async () => {
      const { plans: next } = await createPlan({
        name: template.name,
        weeklyTarget: template.weeklyTarget,
        days: template.days.map((d) => ({
          name: d.name,
          weekday: null,
          exercises: d.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets,
            repMin: e.repMin,
            repMax: e.repMax,
            restSeconds: e.rest,
          })),
        })),
      });
      setPlans(next);
      setCreating(false);
      toast.success(`${template.name} angelegt`);
    }, "Konnte Vorlage nicht anlegen");

  const handleDuplicate = (id: string) =>
    run(async () => {
      const { plans: next } = await createPlan({ duplicateOf: id });
      setPlans(next);
      toast.success("Plan dupliziert");
    }, "Konnte Plan nicht duplizieren");

  const handleActivate = (id: string) =>
    run(async () => {
      const { plans: next } = await updatePlan({ id, isActive: true });
      setPlans(next);
    }, "Konnte Plan nicht aktivieren");

  const handleDelete = () => {
    const id = deleting;
    if (!id) return;
    setDeleting(null);
    return run(async () => {
      setPlans(await deletePlan(id));
      toast.success("Plan gelöscht");
    }, "Konnte Plan nicht löschen");
  };

  const deletingPlan = plans.find((p) => p.id === deleting);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Deine Trainingspläne</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">Pläne</h1>
      </div>


      {loading ? (
        <div className="h-32 animate-pulse rounded-card bg-card" />
      ) : plans.length === 0 ? (
        <Card className="gap-2">
          <div className="px-(--card-spacing)">
            <p className="text-subheading font-display">Noch kein Plan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nimm eine fertige Vorlage oder fang leer an.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="gap-4">
              <div className="flex items-start justify-between gap-3 px-(--card-spacing)">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-subheading font-display">{plan.name}</h2>
                    {plan.isActive && (
                      <span className="shrink-0 rounded-pill bg-blush px-2 py-0.5 text-[11px] font-medium text-blush-foreground">
                        aktiv
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {plan.days.length} {plan.days.length === 1 ? "Tag" : "Tage"} ·{" "}
                    {plan.days.reduce((sum, d) => sum + d.exercises.length, 0)} Übungen
                    {plan.weeklyTarget ? ` · ${plan.weeklyTarget}× pro Woche` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleting(plan.id)}
                  disabled={busy}
                  aria-label={`${plan.name} löschen`}
                  className="shrink-0 hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>

              {plan.days.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-(--card-spacing)">
                  {plan.days.map((day) => (
                    <span
                      key={day.id}
                      className="rounded-pill bg-elevated px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {day.name}
                      {day.weekday !== null && ` · ${WEEKDAY_NAMES[day.weekday].slice(0, 2)}`}
                    </span>
                  ))}
                </div>
              )}

              {/* Duplizieren steht bewusst als Text neben dem Bearbeiten:
                  ein Plan als Kopie weiterbauen ist der übliche Weg zu einer
                  Variante, kein versteckter Sonderfall. */}
              <div className="flex flex-wrap gap-2 px-(--card-spacing)">
                <Link
                  href={`/plaene/${plan.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "min-w-[9rem] flex-1",
                  })}
                >
                  <Pencil className="size-4" />
                  Bearbeiten
                </Link>
                <Button
                  variant="outline"
                  className="min-w-[9rem] flex-1"
                  onClick={() => handleDuplicate(plan.id)}
                  disabled={busy}
                >
                  <Copy />
                  Duplizieren
                </Button>
                {!plan.isActive && (
                  <Button
                    variant="secondary"
                    className="min-w-[9rem] flex-1"
                    onClick={() => handleActivate(plan.id)}
                    disabled={busy}
                  >
                    <Check />
                    Aktiv setzen
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {creating ? (
        <Card className="gap-4">
          <div className="px-(--card-spacing)">
            <h2 className="text-subheading font-display">Vorlage wählen</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Die Übungen und Wiederholungsbereiche kannst du danach frei anpassen.
            </p>
          </div>

          <div className="flex flex-col gap-2 px-(--card-spacing)">
            {SPLIT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={busy}
                onClick={() => handleTemplate(template)}
                className="flex flex-col gap-1 rounded-panel bg-elevated p-4 text-left ring-1 ring-foreground/8 transition-colors hover:ring-foreground/25 disabled:opacity-50"
              >
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium">{template.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {template.days.length} {template.days.length === 1 ? "Tag" : "Tage"} ·{" "}
                    empfohlen {template.weeklyTarget}× pro Woche
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{template.description}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 px-(--card-spacing)">
            <p className="text-[11px] text-muted-foreground">Oder leer starten</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name des Plans"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
              />
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={busy || !newName.trim()}>
                  Anlegen
                </Button>
                <Button variant="ghost" onClick={() => setCreating(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="outline" size="lg" className="w-fit" onClick={() => setCreating(true)}>
          <Plus />
          Neuer Plan
        </Button>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>„{deletingPlan?.name}“ löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Plan und seine Tage werden entfernt. Bereits protokollierte Einheiten bleiben in
              deinem Verlauf erhalten.
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
