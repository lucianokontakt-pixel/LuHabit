"use client";

import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

export type SessionSet = {
  weight: number;
  reps: number;
  done: boolean;
};

function Stepper({
  label,
  value,
  suffix,
  step,
  min = 0,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  suffix: string;
  step: number;
  min?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center rounded-pill bg-elevated ring-1 ring-foreground/8">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}
        disabled={disabled || value <= min}
        aria-label={`${label} verringern`}
        className="flex size-9 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:text-foreground disabled:opacity-25"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="nums min-w-0 flex-1 text-center text-sm">
        {formatNumber(value)}
        <span className="ml-0.5 text-[11px] text-muted-foreground">{suffix}</span>
      </span>
      <button
        type="button"
        onClick={() => onChange(Number((value + step).toFixed(2)))}
        disabled={disabled}
        aria-label={`${label} erhöhen`}
        className="flex size-9 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:text-foreground disabled:opacity-25"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function SetRow({
  index,
  set,
  weightStep,
  onChange,
  onToggleDone,
}: {
  index: number;
  set: SessionSet;
  weightStep: number;
  onChange: (patch: Partial<SessionSet>) => void;
  onToggleDone: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-panel p-2 transition-colors",
        set.done ? "bg-blush/40" : "bg-card"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-pill text-xs font-medium",
          set.done ? "bg-blush text-blush-foreground" : "bg-elevated text-muted-foreground"
        )}
      >
        {index + 1}
      </span>

      <Stepper
        label="Gewicht"
        value={set.weight}
        suffix="kg"
        step={weightStep}
        onChange={(weight) => onChange({ weight })}
      />
      <Stepper
        label="Wiederholungen"
        value={set.reps}
        suffix="×"
        step={1}
        min={0}
        onChange={(reps) => onChange({ reps })}
      />

      <button
        type="button"
        onClick={onToggleDone}
        aria-label={set.done ? `Satz ${index + 1} zurücksetzen` : `Satz ${index + 1} abhaken`}
        aria-pressed={set.done}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-pill transition-colors",
          set.done
            ? "bg-primary text-primary-foreground"
            : "bg-elevated text-muted-foreground ring-1 ring-foreground/8 hover:text-foreground"
        )}
      >
        <Check className="size-4" />
      </button>
    </div>
  );
}
