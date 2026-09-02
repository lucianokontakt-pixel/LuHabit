"use client";

import { cn } from "@/lib/utils";

/**
 * Ein Knopf aus einer Reihe, von denen einer gewählt ist.
 *
 * Muskelgruppe, Gerät, Aufwärmsatz, Wochentag, die Legende der Körperkarte —
 * neunmal stand derselbe Klassensatz da, und zwei Fassungen waren schon
 * auseinandergelaufen: mal `bg-card` als Ruhezustand, mal `bg-elevated`. Beide
 * sind richtig, aber sie hängen davon ab, worauf der Chip liegt — und genau das
 * ist eine Entscheidung, die die aufrufende Stelle trifft, nicht der Zufall.
 *
 * `touch-target`, weil 28 Pixel Höhe für einen Finger zu wenig sind; die
 * Trefferfläche wächst, das Aussehen nicht (siehe app/globals.css).
 */
export function Chip({
  active,
  onClick,
  children,
  /** Worauf der Chip liegt: auf einer Karte oder auf dem Seitenhintergrund. */
  ground = "card",
  className,
  ...props
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ground?: "card" | "elevated";
  className?: string;
} & Omit<React.ComponentProps<"button">, "onClick" | "children" | "className">) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "touch-target shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : cn(
              ground === "card" ? "bg-card" : "bg-elevated",
              "text-muted-foreground hover:text-foreground"
            ),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
