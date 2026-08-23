"use client";

import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Kompaktes Zahlenfeld für die Plan-Einstellungen. Leert das Feld statt eine
 * 0 zu erzwingen, damit man einen Wert überschreiben kann ohne erst zu löschen.
 *
 * Mit `stepper` bekommt es zusätzlich Plus/Minus-Tasten — für Werte, die man
 * unterwegs eher antippt als über die Tastatur eintippt (Wiederholungen,
 * Dauer in Fünfer-Schritten).
 *
 * Die Zahl steht bei 16px (text-base) und darf nicht kleiner werden: iOS zoomt
 * den Viewport hinein, sobald ein fokussiertes Feld darunter liegt, und das
 * Layout springt beim Antippen. Kompakt wird das Feld über seine Höhe und die
 * Breite der Tasten, nicht über den Schriftgrad.
 */
export function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  placeholder,
  className,
  stepper = false,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  className?: string;
  stepper?: boolean;
}) {
  function adjust(delta: number) {
    const base = value ?? min;
    const next = Math.max(min, Math.min(max ?? Infinity, base + delta));
    onChange(next);
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Label htmlFor={id} className="truncate text-[11px] text-muted-foreground">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </Label>
      {stepper ? (
        <div className="flex h-10 items-stretch overflow-hidden rounded-pill bg-elevated ring-1 ring-foreground/8">
          <button
            type="button"
            onClick={() => adjust(-step)}
            disabled={value !== null && value <= min}
            aria-label={`${label} verringern`}
            className="flex w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:bg-foreground/5 disabled:opacity-25"
          >
            <Minus className="size-3.5" />
          </button>
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            value={value ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange(null);
                return;
              }
              const parsed = Number(raw.replace(",", "."));
              onChange(Number.isFinite(parsed) ? parsed : null);
            }}
            className="nums w-full min-w-0 flex-1 bg-transparent text-center text-base outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => adjust(step)}
            disabled={max !== undefined && value !== null && value >= max}
            aria-label={`${label} erhöhen`}
            className="flex w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:bg-foreground/5 disabled:opacity-25"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      ) : (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
              return;
            }
            const parsed = Number(raw.replace(",", "."));
            onChange(Number.isFinite(parsed) ? parsed : null);
          }}
          className="h-10 px-3"
        />
      )}
    </div>
  );
}
