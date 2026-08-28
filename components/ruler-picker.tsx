"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

/**
 * Gewicht per Wischen einstellen: eine Skala, die unter einem festen Marker
 * durchläuft. Gedacht für den Daumen — größere Sprünge sind eine Bewegung
 * statt zwanzig Antipper, die Feinstufe rastet trotzdem exakt ein.
 *
 * Die Rasterung macht der Browser (`scroll-snap`), nicht wir: das behält den
 * nativen Schwung samt Abbremsen und kostet keine Frames. Jeder Strich ist
 * ein Snap-Punkt, der Innenabstand links und rechts ist eine halbe Breite,
 * damit auch der erste und der letzte Wert in die Mitte wandern können.
 *
 * Der Wert bleibt beim Aufrufer — das Lineal ist nur eine zweite Hand am
 * selben Wert, neben Plus/Minus und Tastatur.
 */
export function RulerPicker({
  value,
  onChange,
  min,
  max,
  step,
  /** Jeder wievielte Strich ist lang und trägt eine Zahl. */
  majorEvery = 5,
  /** Abstand zweier Striche in px — je feiner die Stufe, desto enger. */
  pitch = 12,
  unit,
  className,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  majorEvery?: number;
  pitch?: number;
  unit?: string;
  className?: string;
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Solange der Finger (oder der Schwung) die Skala bewegt, darf der
  // Gleichlauf von außen nicht dazwischenfahren — sonst ruckelt es.
  const scrollingRef = useRef(false);
  const idleRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  // Wohin wir selbst gerade fahren. Ein solcher Lauf meldet unterwegs
  // Zwischenstände, die kein eingestellter Wert sind — die würden sonst als
  // Eingabe zurücklaufen und die Fahrt auf halber Strecke festhalten.
  const targetRef = useRef<number | null>(null);
  const releaseRef = useRef<number | null>(null);
  // Der Tick ist eine Antwort auf den Finger. Am Schreibtisch (Rad, Pfeiltasten)
  // gibt es nichts zu spüren, und der Browser weist den Aufruf ohne vorherige
  // Berührung ohnehin ab — also fragen wir erst, ob eine Hand im Spiel war.
  const touchedRef = useRef(false);

  const count = Math.max(1, Math.round((max - min) / step) + 1);

  const valueAt = useCallback(
    (i: number) => Number((min + Math.min(count - 1, Math.max(0, i)) * step).toFixed(2)),
    [min, step, count]
  );
  const index = Math.min(count - 1, Math.max(0, Math.round((value - min) / step)));

  // Der Wert kann auch von außen kommen (Plus/Minus, Tastatur, frisch
  // geladener Messwert). Dann fährt die Skala nach — aber nur, wenn sie
  // gerade still steht und wirklich woanders steht.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || scrollingRef.current) return;
    const target = index * pitch;
    if (Math.abs(el.scrollLeft - target) < pitch / 2) return;
    targetRef.current = target;
    // Falls das Ziel nie exakt getroffen wird (Rastung, abgebrochene Fahrt),
    // gibt die Skala nach kurzer Zeit von selbst wieder frei.
    if (releaseRef.current) window.clearTimeout(releaseRef.current);
    releaseRef.current = window.setTimeout(() => {
      targetRef.current = null;
    }, 500);
    el.scrollTo({ left: target, behavior: mountedRef.current ? "smooth" : "auto" });
    mountedRef.current = true;
  }, [index, pitch]);

  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;

    if (targetRef.current !== null) {
      if (Math.abs(el.scrollLeft - targetRef.current) < 1) targetRef.current = null;
      return;
    }

    scrollingRef.current = true;
    mountedRef.current = true;
    if (idleRef.current) window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      scrollingRef.current = false;
    }, 160);

    const next = valueAt(Math.round(el.scrollLeft / pitch));
    if (next !== value) {
      onChange(next);
      // Ein kurzer Tick pro Rastung — auf Android spürbar, auf iOS still.
      if (touchedRef.current) navigator.vibrate?.(3);
    }
  }

  // Die Striche hängen nur an der Skala, nicht am Wert: so kostet das
  // Weiterrasten kein Neuzeichnen von hunderten Knoten.
  const ticks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const major = i % majorEvery === 0;
        return (
          <div
            key={i}
            aria-hidden
            className={cn(
              "relative w-px shrink-0 snap-center self-end rounded-pill",
              major ? "h-5 bg-foreground/35" : "h-2.5 bg-foreground/15"
            )}
          >
            {major && (
              <span className="nums absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted-foreground">
                {formatNumber(Number((min + i * step).toFixed(2)))}
              </span>
            )}
          </div>
        );
      }),
    [count, majorEvery, min, step]
  );

  return (
    <div className={cn("relative h-14 select-none", className)}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onPointerDown={() => {
          touchedRef.current = true;
        }}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={unit ? `${formatNumber(value)} ${unit}` : formatNumber(value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(valueAt(index - 1));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onChange(valueAt(index + 1));
          }
        }}
        data-slot="ruler"
        style={{ ["--pitch" as string]: `${pitch}px` }}
        className={[
          "flex h-full snap-x snap-mandatory items-end overflow-x-auto overflow-y-hidden pb-2",
          "px-[calc(50%-0.5px)] [gap:calc(var(--pitch)-1px)]",
          // Die Skala läuft zu den Rändern hin aus, statt hart abzuschneiden.
          "[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-panel",
        ].join(" ")}
      >
        {ticks}
      </div>

      {/* Der Marker steht still, die Skala wandert — wie bei einer Waage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-1/2 h-6 w-0.5 -translate-x-1/2 rounded-pill bg-foreground"
      />
    </div>
  );
}
