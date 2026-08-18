import {
  Droplets,
  Coffee,
  Dumbbell,
  Footprints,
  BookOpen,
  PenLine,
  Brain,
  Moon,
  Heart,
  Star,
  Flame,
  Music,
  Code,
  Wallet,
  Target,
  type LucideIcon,
} from "lucide-react";

export type HabitType = string;

export type HabitConfig = {
  type: HabitType;
  label: string;
  unit: string;
  icon: LucideIcon;
  defaultGoal: number;
  quickAdd: number[];
  step: number;
  isCustom?: boolean;
};

// Ursprüngliche Standard-Habits — leben inzwischen als echte (bearbeitbare/löschbare)
// Zeilen in custom_habits (siehe migrations/0003_seed_default_habits.sql). Diese Liste
// dient nur noch als "Vorschlag erneut hinzufügen"-Quelle im Neues-Ziel-Dialog, falls
// jemand einen Standard gelöscht hat.
export const DEFAULT_HABIT_SUGGESTIONS: HabitConfig[] = [
  {
    type: "steps",
    label: "Schritte",
    unit: "Schritte",
    icon: Footprints,
    defaultGoal: 10000,
    quickAdd: [1000, 2500, 5000],
    step: 500,
  },
  {
    type: "water",
    label: "Wasser",
    unit: "ml",
    icon: Droplets,
    defaultGoal: 2000,
    quickAdd: [250, 500, 750],
    step: 50,
  },
  {
    type: "coffee",
    label: "Kaffee",
    unit: "Tassen",
    icon: Coffee,
    defaultGoal: 3,
    quickAdd: [1],
    step: 1,
  },
  {
    type: "training",
    label: "Training",
    unit: "Minuten",
    icon: Dumbbell,
    defaultGoal: 30,
    quickAdd: [15, 30, 45],
    step: 5,
  },
  {
    type: "reading",
    label: "Lesen",
    unit: "Minuten",
    icon: BookOpen,
    defaultGoal: 20,
    quickAdd: [5, 10, 15],
    step: 5,
  },
  {
    type: "writing",
    label: "Schreiben",
    unit: "Minuten",
    icon: PenLine,
    defaultGoal: 15,
    quickAdd: [5, 10, 15],
    step: 5,
  },
];

// Auswahl an Icons für selbst erstellte Mini-Habits
export const ICON_OPTIONS: Record<string, LucideIcon> = {
  Target,
  BookOpen,
  PenLine,
  Brain,
  Moon,
  Heart,
  Star,
  Flame,
  Music,
  Code,
  Wallet,
  Dumbbell,
  Droplets,
  Coffee,
  Footprints,
};

export function iconForName(name: string): LucideIcon {
  return ICON_OPTIONS[name] ?? Target;
}

export function nameForIcon(icon: LucideIcon): string {
  const found = Object.entries(ICON_OPTIONS).find(([, v]) => v === icon);
  return found?.[0] ?? "Target";
}

export function todayISO(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("sv-SE");
}
