"use client";

import { Minus, Plus } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RulerPicker } from "@/components/ruler-picker";
import { formatNumber } from "@/lib/format";

/** Bis hierher reicht die Skala — darüber liegt kein Satz mehr, den man tippt. */
const MAX_WEIGHT = 300;

/**
 * Das Gewicht eines Satzes am Lineal einstellen. Die Satzzeile bleibt dadurch
 * schmal: sie zeigt weiter Plus/Minus für den einzelnen Schritt, und wer von
 * 40 auf 80 will, tippt auf die Zahl und wischt einmal.
 */
export function WeightSheet({
  open,
  onOpenChange,
  title,
  value,
  step,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  // Die Skala endet knapp über dem, was gerade eingetragen ist — falls jemand
  // doch schwerer wird, wächst sie mit, statt vorher zu enden.
  const max = Math.max(MAX_WEIGHT, Math.ceil((value + 50) / step) * step);

  function nudge(direction: 1 | -1) {
    onChange(Math.max(0, Number((value + direction * step).toFixed(2))));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>{title}</SheetTitle>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={value <= 0}
            aria-label="Gewicht verringern"
            className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-elevated text-muted-foreground ring-1 ring-foreground/8 transition-colors hover:text-foreground disabled:opacity-25"
          >
            <Minus className="size-4" />
          </button>
          <p className="nums font-display text-heading-lg leading-none">
            {formatNumber(value)}
            <span className="ml-1 text-body text-muted-foreground">kg</span>
          </p>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Gewicht erhöhen"
            className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-elevated text-muted-foreground ring-1 ring-foreground/8 transition-colors hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <RulerPicker
          value={value}
          onChange={onChange}
          min={0}
          max={max}
          step={step}
          majorEvery={Math.max(1, Math.round(10 / step))}
          pitch={14}
          unit="kg"
          ariaLabel="Gewicht einstellen"
        />

        <SheetClose render={<Button size="lg" className="w-full" />}>Fertig</SheetClose>
      </SheetContent>
    </Sheet>
  );
}
