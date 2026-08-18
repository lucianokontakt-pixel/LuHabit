import { Droplets, Coffee, Dumbbell, Footprints, type LucideIcon } from "lucide-react";

export type HabitType = "steps" | "water" | "coffee" | "training";

export type HabitConfig = {
  type: HabitType;
  label: string;
  unit: string;
  icon: LucideIcon;
  defaultGoal: number;
  quickAdd: number[];
  step: number;
};

export const HABITS: Record<HabitType, HabitConfig> = {
  steps: {
    type: "steps",
    label: "Schritte",
    unit: "Schritte",
    icon: Footprints,
    defaultGoal: 10000,
    quickAdd: [1000, 2500, 5000],
    step: 500,
  },
  water: {
    type: "water",
    label: "Wasser",
    unit: "ml",
    icon: Droplets,
    defaultGoal: 2000,
    quickAdd: [250, 500, 750],
    step: 50,
  },
  coffee: {
    type: "coffee",
    label: "Kaffee",
    unit: "Tassen",
    icon: Coffee,
    defaultGoal: 3,
    quickAdd: [1],
    step: 1,
  },
  training: {
    type: "training",
    label: "Training",
    unit: "Minuten",
    icon: Dumbbell,
    defaultGoal: 30,
    quickAdd: [15, 30, 45],
    step: 5,
  },
};

export const HABIT_ORDER: HabitType[] = ["steps", "water", "coffee", "training"];

export function todayISO(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("sv-SE");
}
