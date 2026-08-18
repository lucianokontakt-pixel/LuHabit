"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ICON_OPTIONS, HabitConfig, nameForIcon } from "@/lib/habits";
import { UNIT_CATEGORIES, categoryForUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

export type HabitFormResult = {
  label: string;
  unit: string;
  icon: string;
  defaultGoal: number;
  quickAdd: number[];
  step: number;
};

function buildResult(label: string, unit: string, icon: string, goal: number): HabitFormResult {
  const quickStep = Math.max(1, Math.round(goal / 4));
  const quickAdd = Array.from(new Set([quickStep, Math.max(1, Math.round(goal / 2)), goal]));
  return { label: label.trim(), unit: unit.trim(), icon, defaultGoal: goal, quickAdd, step: quickStep };
}

export function HabitFormDialog({
  open,
  onOpenChange,
  initial,
  suggestions,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: HabitConfig;
  suggestions?: HabitConfig[];
  onSubmit: (result: HabitFormResult) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [category, setCategory] = useState<string>(
    (initial && categoryForUnit(initial.unit)) || "time"
  );
  const [unit, setUnit] = useState(initial?.unit ?? "Minuten");
  const [goal, setGoal] = useState(initial ? String(initial.defaultGoal) : "10");
  const [icon, setIcon] = useState(initial ? nameForIcon(initial.icon) : "Target");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Formular beim Öffnen einmalig mit den initial-Werten befüllen
    setLabel(initial?.label ?? "");
    const cat = (initial && categoryForUnit(initial.unit)) || "time";
    setCategory(cat);
    setUnit(initial?.unit ?? UNIT_CATEGORIES.find((c) => c.key === cat)?.units[0] ?? "Minuten");
    setGoal(initial ? String(initial.defaultGoal) : "10");
    setIcon(initial ? nameForIcon(initial.icon) : "Target");
  }, [open, initial]);

  function applySuggestion(s: HabitConfig) {
    setLabel(s.label);
    const cat = categoryForUnit(s.unit) || "time";
    setCategory(cat);
    setUnit(s.unit);
    setGoal(String(s.defaultGoal));
    setIcon(nameForIcon(s.icon));
  }

  function handleCategoryChange(key: string) {
    setCategory(key);
    const cat = UNIT_CATEGORIES.find((c) => c.key === key);
    if (cat && !cat.units.includes(unit)) setUnit(cat.units[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const defaultGoal = Number(goal);
    if (!label.trim() || !unit.trim() || !Number.isFinite(defaultGoal) || defaultGoal <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit(buildResult(label, unit, icon, defaultGoal));
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ziel bearbeiten" : "Neues Ziel anlegen"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Name, Einheit, Icon oder Tagesziel anpassen."
                : 'Eigene Habit mit Namen, Einheit und Tagesziel — z. B. „Meditieren, 10 Minuten".'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {!isEdit && suggestions && suggestions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Vorschläge wieder hinzufügen</Label>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => {
                    const SIcon = s.icon;
                    return (
                      <button
                        key={s.type}
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                      >
                        <SIcon className="size-3.5" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-label">Name</Label>
              <Input
                id="habit-label"
                placeholder="z. B. Meditieren"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Art der Einheit</Label>
              <div className="flex flex-wrap gap-1.5">
                {UNIT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCategoryChange(cat.key)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      category === cat.key
                        ? "border-foreground bg-secondary"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(() => {
                  const catUnits = UNIT_CATEGORIES.find((c) => c.key === category)?.units ?? [];
                  return catUnits.includes(unit) ? catUnits : [...catUnits, unit];
                })().map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                      unit === u
                        ? "border-foreground bg-secondary font-medium"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-goal">Tagesziel ({unit})</Label>
              <Input
                id="habit-goal"
                type="number"
                min={1}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ICON_OPTIONS).map(([name, Icon]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg border transition-colors",
                      icon === name
                        ? "border-foreground bg-secondary"
                        : "border-border hover:bg-secondary/50"
                    )}
                    aria-label={name}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Speichere..." : isEdit ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
