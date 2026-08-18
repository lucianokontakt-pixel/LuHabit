"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { ICON_OPTIONS } from "@/lib/habits";
import { useHabitRegistry } from "@/lib/habit-registry";
import { cn } from "@/lib/utils";

export function AddHabitDialog() {
  const { addCustomHabit } = useHabitRegistry();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("Minuten");
  const [goal, setGoal] = useState("10");
  const [icon, setIcon] = useState("Target");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setLabel("");
    setUnit("Minuten");
    setGoal("10");
    setIcon("Target");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const defaultGoal = Number(goal);
    if (!label.trim() || !unit.trim() || !Number.isFinite(defaultGoal) || defaultGoal <= 0) return;

    const quickStep = Math.max(1, Math.round(defaultGoal / 4));
    const quickAdd = Array.from(new Set([quickStep, Math.max(1, Math.round(defaultGoal / 2)), defaultGoal]));

    setSubmitting(true);
    try {
      await addCustomHabit({ label: label.trim(), unit: unit.trim(), icon, defaultGoal, quickAdd, step: quickStep });
      setOpen(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        <Plus className="size-3.5" />
        Neues Ziel
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Neues Ziel anlegen</DialogTitle>
            <DialogDescription>
              Eigene Habit mit Namen, Einheit und Tagesziel — z. B. &bdquo;Meditieren, 10 Minuten&ldquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-unit">Einheit</Label>
                <Input
                  id="habit-unit"
                  placeholder="z. B. Minuten, Seiten"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-goal">Tagesziel</Label>
                <Input
                  id="habit-goal"
                  type="number"
                  min={1}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  required
                />
              </div>
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
              {submitting ? "Erstelle..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
