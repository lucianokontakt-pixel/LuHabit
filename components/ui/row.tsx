"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Eine Zeile in einer Section.
 *
 * Rendert einen Knopf, sobald `onClick` da ist, sonst ein einfaches Element —
 * dadurch ist die Tastaturbedienung automatisch richtig, ohne dass irgendwo
 * `role` und `tabIndex` von Hand gesetzt werden müssten.
 *
 * `children` ist der Platz fürs Bedienelement. Deshalb kann dieselbe Zeile
 * einmal weiterführen und einmal schalten, ohne dass es zwei Bauteile braucht.
 *
 * Die Trennlinie sitzt oben statt unten und beginnt hinter dem Icon: so läuft
 * sie nicht über die Icon-Spalte, und die letzte Zeile braucht keine
 * Sonderbehandlung.
 */
export function Row({
  icon: Icon,
  iconTint,
  title,
  subtitle,
  value,
  accessory,
  onClick,
  danger,
  disabled,
  children,
}: {
  icon?: LucideIcon;
  /** Farbe der Icon-Fläche, z. B. "var(--chart-2)". Ohne Angabe neutral. */
  iconTint?: string;
  title: string;
  subtitle?: React.ReactNode;
  /** Der aktuelle Wert, rechtsbündig vor dem Chevron. */
  value?: string;
  accessory?: "chevron" | "none";
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const Element = onClick ? "button" : "div";

  return (
    <Element
      {...(onClick ? { type: "button" as const, onClick, disabled } : {})}
      className={cn(
        "flex w-full items-center gap-3 px-(--card-spacing) py-3 text-left",
        "border-t border-border/60 first:border-t-0",
        onClick && !disabled && "transition-colors hover:bg-elevated",
        disabled && "opacity-50"
      )}
    >
      {Icon && (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-tile"
          style={{
            backgroundColor: iconTint
              ? `color-mix(in srgb, ${iconTint} 18%, transparent)`
              : "var(--elevated)",
            color: iconTint ?? "var(--muted-foreground)",
          }}
        >
          <Icon className="size-4" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span
          className={cn("block truncate text-sm", danger ? "text-destructive" : "text-foreground")}
        >
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>

      {children}

      {value && <span className="shrink-0 text-sm text-muted-foreground">{value}</span>}

      {accessory === "chevron" && (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      )}
    </Element>
  );
}
