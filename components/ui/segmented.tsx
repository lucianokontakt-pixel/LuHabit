"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Erklärt die Wahl. Wird nur in der gestapelten Fassung gezeigt. */
  hint?: string;
};

/**
 * Eine aus n.
 *
 * Es gab davon drei handgebaute Fassungen — Theme, Geschlecht, Aktivitätslevel
 * — mit je eigener, leicht abweichender Klassenkette. Eine reicht.
 *
 * `stacked` untereinander statt nebeneinander: sobald die Beschriftungen zu
 * lang für eine Zeile sind oder jede Wahl eine Erklärung braucht.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  stacked,
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(stacked ? "flex flex-col gap-1.5" : "flex gap-2", className)}>
      {options.map(({ value: v, label, icon: Icon, hint }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={cn(
              "text-sm font-medium transition-colors",
              stacked
                ? "flex items-center justify-between gap-3 rounded-field px-3.5 py-2.5 text-left"
                : "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-pill",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-elevated text-muted-foreground ring-1 ring-foreground/8 hover:text-foreground"
            )}
          >
            <span className={cn("flex items-center gap-1.5", stacked && "text-foreground", active && stacked && "text-primary-foreground")}>
              {Icon && <Icon className="size-3.5 shrink-0" />}
              {label}
            </span>
            {hint && (
              <span
                className={cn(
                  "shrink-0 text-xs font-normal",
                  active ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
