"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSigned } from "@/lib/format";

export type DeltaDirection = "up-good" | "down-good" | "neutral";

/**
 * Die steep-Signatur: große Kennzahl, darunter eine ruhige Delta-Zeile
 * ("↑ 5,5 % vs. letzte Woche"). Bewusst ohne Ampelfarben — die Richtung
 * trägt der Pfeil, die Farbe bleibt zurückhaltend.
 */
export function StatValue({
  value,
  unit,
  label,
  delta,
  deltaUnit,
  deltaLabel,
  direction = "neutral",
  size = "default",
  className,
}: {
  value: string;
  unit?: string;
  label?: string;
  delta?: number | null;
  deltaUnit?: string;
  deltaLabel?: string;
  direction?: DeltaDirection;
  size?: "default" | "lg" | "sm";
  className?: string;
}) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  const rising = hasDelta && delta > 0;
  const flat = hasDelta && Math.abs(delta) < 0.05;
  const good =
    direction === "neutral" || flat
      ? null
      : direction === "up-good"
        ? rising
        : !rising;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <p
        className={cn(
          "nums leading-none",
          size === "lg" && "text-4xl sm:text-heading",
          size === "default" && "text-heading-sm",
          size === "sm" && "text-body-lg"
        )}
      >
        {value}
        {unit && (
          <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
      {hasDelta && (
        <p
          className={cn(
            "flex items-center gap-1 text-xs",
            good === null ? "text-muted-foreground" : good ? "text-success" : "text-muted-foreground"
          )}
        >
          {!flat &&
            (rising ? (
              <ArrowUp className="size-3 shrink-0" />
            ) : (
              <ArrowDown className="size-3 shrink-0" />
            ))}
          <span className="nums">
            {formatSigned(delta, 1)}
            {deltaUnit ? ` ${deltaUnit}` : ""}
          </span>
          {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
        </p>
      )}
    </div>
  );
}
