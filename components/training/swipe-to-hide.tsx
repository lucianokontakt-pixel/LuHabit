"use client";

import { useRef, useState } from "react";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ab so viel Weg nach links zählt eine Geste als Ausblenden, nicht als Wischversuch. */
const SCHWELLE = 88;

/**
 * Eine Zeile, die sich nach links wischen lässt, um sie auszublenden.
 *
 * Erkennt selbst, ob eine Geste horizontal oder vertikal gemeint ist — sonst
 * bräuchte jedes Scrollen durch die lange Übungsliste erst einen fehlgeschlagenen
 * Wischversuch, bevor es durchgeht. Springt ohne Bibliothek aus, weil ein
 * Wisch nach links nur Pointer-Events und eine Transform-Verschiebung braucht.
 */
export function SwipeToHide({
  onHide,
  disabled,
  children,
}: {
  onHide: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const achse = useRef<"x" | "y" | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return;
    start.current = { x: e.clientX, y: e.clientY };
    achse.current = null;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const diffX = e.clientX - start.current.x;
    const diffY = e.clientY - start.current.y;
    if (achse.current === null) {
      if (Math.abs(diffX) < 8 && Math.abs(diffY) < 8) return;
      achse.current = Math.abs(diffX) > Math.abs(diffY) ? "x" : "y";
    }
    if (achse.current !== "x") return;
    // Nur nach links: nach rechts wischen soll nichts tun, es gibt dort
    // nichts zu zeigen.
    setDx(Math.min(0, diffX));
  }

  function beenden() {
    if (achse.current === "x" && dx <= -SCHWELLE) onHide();
    start.current = null;
    achse.current = null;
    setDragging(false);
    setDx(0);
  }

  const ueberSchwelle = dx <= -SCHWELLE;

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 right-0 flex w-20 items-center justify-center gap-1.5 text-muted-foreground transition-colors",
          ueberSchwelle && "bg-foreground/10 text-foreground"
        )}
      >
        <EyeOff className="size-4" />
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={beenden}
        onPointerCancel={beenden}
        style={{ transform: dx !== 0 ? `translateX(${dx}px)` : undefined }}
        className={cn(
          "relative bg-card touch-pan-y",
          !dragging && "transition-transform duration-200"
        )}
      >
        {children}
      </div>
    </div>
  );
}
