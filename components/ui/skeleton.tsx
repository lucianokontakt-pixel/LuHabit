import { cn } from "@/lib/utils";

/**
 * Der Platzhalter, solange etwas lädt.
 *
 * Stand zehnmal im Code, in fünf verschiedenen Höhen — nicht weil fünf Höhen
 * gebraucht würden, sondern weil jede Seite ihre eigene geschätzt hat. Die Höhe
 * bleibt einstellbar (ein Platzhalter, der eine ganze Einheit vertritt, darf
 * größer sein als einer für eine Zeile), aber Form, Farbe und Pulsieren
 * kommen von hier.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-card bg-card", className)} />;
}
