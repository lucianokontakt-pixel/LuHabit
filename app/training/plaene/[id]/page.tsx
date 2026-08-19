"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DayEditor, type EditDay } from "@/components/training/day-editor";
import { NumberField } from "@/components/training/number-field";
import { useTraining } from "@/lib/training-store";
import { updatePlan } from "@/lib/api-training";
import type { WorkoutPlan } from "@/lib/training";

function toEditDays(plan: WorkoutPlan): EditDay[] {
  return [...plan.days]
    .sort((a, b) => a.position - b.position)
    .map((day) => ({
      key: day.id,
      name: day.name,
      weekday: day.weekday,
      exercises: [...day.exercises]
        .sort((a, b) => a.position - b.position)
        .map((e) => ({
          key: e.id,
          exerciseId: e.exerciseId,
          sets: e.sets,
          repMin: e.repMin,
          repMax: e.repMax,
          restSeconds: e.restSeconds,
          increment: e.increment,
          startWeight: e.startWeight,
        })),
    }));
}

export default function PlanEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { plans, setPlans, loading } = useTraining();

  const plan = plans.find((p) => p.id === id);

  const [name, setName] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null);
  const [days, setDays] = useState<EditDay[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!plan || hydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- übernimmt den geladenen Plan einmalig in den Editor-State
    setName(plan.name);
    setWeeklyTarget(plan.weeklyTarget);
    setDays(toEditDays(plan));
    setHydrated(true);
  }, [plan, hydrated]);

  const dirty = useMemo(() => {
    if (!plan || !hydrated) return false;
    return (
      name !== plan.name ||
      weeklyTarget !== plan.weeklyTarget ||
      JSON.stringify(days) !== JSON.stringify(toEditDays(plan))
    );
  }, [plan, hydrated, name, weeklyTarget, days]);

  async function handleSave() {
    if (!plan) return;
    if (!name.trim()) {
      toast.error("Der Plan braucht einen Namen.");
      return;
    }
    setSaving(true);
    try {
      const { plans: next } = await updatePlan({
        id: plan.id,
        name: name.trim(),
        weeklyTarget,
        days: days.map((d) => ({
          name: d.name,
          weekday: d.weekday,
          exercises: d.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets,
            repMin: e.repMin,
            repMax: e.repMax,
            restSeconds: e.restSeconds,
            increment: e.increment,
            startWeight: e.startWeight,
          })),
        })),
      });
      setPlans(next);
      setHydrated(false);
      toast.success("Plan gespeichert");
      router.push("/training/plaene");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Plan nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  function addDay() {
    setDays((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        name: `Tag ${prev.length + 1}`,
        weekday: null,
        exercises: [],
      },
    ]);
  }

  if (loading && !plan) {
    return <div className="h-64 animate-pulse rounded-card bg-card" />;
  }

  if (!plan) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Dieser Plan wurde nicht gefunden.</p>
        <Link href="/training/plaene" className={buttonVariants({ variant: "outline" })}>
          Zurück zu den Plänen
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-3">
        <Link
          href="/training/plaene"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Pläne
        </Link>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Name des Plans"
          className="h-auto border-0 bg-transparent px-0 font-display text-4xl leading-tight tracking-tight focus-visible:ring-0 sm:text-heading"
        />
        <p className="text-sm text-muted-foreground">
          {days.length} {days.length === 1 ? "Tag" : "Tage"} ·{" "}
          {days.reduce((sum, d) => sum + d.exercises.length, 0)} Übungen
        </p>

        <div className="flex items-end gap-3">
          <NumberField
            id="plan-weekly-target"
            label="Wochenziel"
            suffix="Einheiten"
            value={weeklyTarget}
            min={1}
            max={14}
            placeholder="kein Ziel"
            onChange={setWeeklyTarget}
            className="w-40"
          />
          <p className="pb-2.5 text-xs text-muted-foreground">
            Wie oft du pro Woche trainieren willst. Die Tage rotieren frei — das Ziel misst nur,
            wie oft du wirklich da warst.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {days.map((day, index) => (
          <DayEditor
            key={day.key}
            day={day}
            onChange={(next) => setDays((prev) => prev.map((d, i) => (i === index ? next : d)))}
            onRemove={() => setDays((prev) => prev.filter((_, i) => i !== index))}
          />
        ))}
      </div>

      <Button variant="outline" size="lg" onClick={addDay}>
        <Plus />
        Trainingstag hinzufügen
      </Button>

      {days.length === 0 && (
        <Card className="gap-0">
          <p className="px-(--card-spacing) text-sm text-muted-foreground">
            Ein Plan besteht aus Tagen — zum Beispiel Push, Pull und Legs. Die App rotiert
            automatisch durch sie durch, außer du weist einem Tag einen festen Wochentag zu.
          </p>
        </Card>
      )}

      {/* Speichern bleibt in Reichweite, auch bei langen Plänen. */}
      <div
        className="fixed inset-x-0 bottom-[var(--bottom-nav-offset)] z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl sm:bottom-0 sm:px-6"
        style={
          {
            // Auf Mobile sitzt die Tab-Leiste unten — die Speicherleiste legt sich darüber.
            "--bottom-nav-offset": "calc(68px + env(safe-area-inset-bottom))",
          } as React.CSSProperties
        }
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {dirty ? "Ungespeicherte Änderungen" : "Alles gespeichert"}
          </p>
          <Button size="lg" onClick={handleSave} disabled={saving || !dirty}>
            <Save />
            {saving ? "Speichert…" : "Speichern"}
          </Button>
        </div>
      </div>
    </div>
  );
}
