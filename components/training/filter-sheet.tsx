"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Ein Filter als Knopf, der ein Blatt öffnet — statt als Reihe, die man
 * seitwärts schiebt.
 *
 * Die quer scrollenden Chips hatten zwei Fehler, und der zweite ist der
 * schlimmere: man musste schieben, um überhaupt zu sehen, was es gibt — und man
 * sah nicht, was gerade eingestellt war, sobald die aktive Wahl aus dem Bild
 * gescrollt war. Der Knopf trägt seinen Wert im Text. Was es zur Auswahl gibt,
 * steht untereinander und wird angetippt, nicht gesucht.
 *
 * Bewusst ein Blatt und kein Menü: die Liste wird bei den Geräten zehn Zeilen
 * lang, und zehn Zeilen an einem Knopf am oberen Bildschirmrand sind auf dem
 * Handy nicht mit dem Daumen erreichbar.
 */

export type FilterOption<T extends string> = {
  value: T;
  label: string;
  /** Rechts in Grau — Trefferzahl oder Zusatz. */
  hint?: string;
};

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  /** Der Text auf dem Knopf, wenn nichts gewählt ist. */
  allLabel = "Alle",
  className,
}: {
  label: string;
  value: T | null;
  options: FilterOption<T>[];
  onChange: (value: T | null) => void;
  allLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const gewaehlt = options.find((o) => o.value === value) ?? null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-w-0 shrink items-center gap-1 rounded-pill py-1.5 pr-2.5 pl-3 text-xs transition-colors",
          gewaehlt
            ? "bg-primary text-primary-foreground"
            : "bg-card text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <span className="truncate">{gewaehlt ? gewaehlt.label : allLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-60" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="max-h-[75dvh]">
          <SheetTitle>{label}</SheetTitle>
          <div className="-mx-1 flex flex-col overflow-y-auto px-1">
            <Zeile
              label={allLabel}
              aktiv={value === null}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            />
            {options.map((o) => (
              <Zeile
                key={o.value}
                label={o.label}
                hint={o.hint}
                aktiv={o.value === value}
                onClick={() => {
                  // Nochmal auf das Gewählte tippen hebt es auf — dieselbe
                  // Geste wie vorher bei den Chips.
                  onChange(o.value === value ? null : o.value);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Zeile({
  label,
  hint,
  aktiv,
  onClick,
}: {
  label: string;
  hint?: string;
  aktiv: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // min-h-11: die Fingerkuppe braucht 44 px, sonst trifft man die
      // Nachbarzeile. Dieselbe Grenze wie bei den Menüeinträgen in globals.css.
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-field px-3 text-left text-sm transition-colors",
        aktiv ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-xs text-muted-foreground">{hint}</span>}
      <Check className={cn("size-4 shrink-0", aktiv ? "opacity-100" : "opacity-0")} />
    </button>
  );
}
