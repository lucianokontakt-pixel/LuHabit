"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Kompaktes Zahlenfeld für die Plan-Einstellungen. Leert das Feld statt eine
 * 0 zu erzwingen, damit man einen Wert überschreiben kann ohne erst zu löschen.
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
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Label htmlFor={id} className="truncate text-[11px] text-muted-foreground">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </Label>
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
        className="h-10 px-3 text-sm"
      />
    </div>
  );
}
