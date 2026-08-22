"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/format";

/**
 * Pausentimer. Läuft auf Wanduhr-Zeit statt auf Ticks, damit er auch dann
 * stimmt, wenn das Handy zwischendurch schläft und setInterval gedrosselt wird.
 * Die Positionierung übernimmt die Session-Leiste, in der er steckt.
 */
export function RestTimer({
  endsAt,
  total,
  onExtend,
  onDismiss,
}: {
  endsAt: number;
  total: number;
  onExtend: (seconds: number) => void;
  onDismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    const tick = () => setRemaining(Math.max(0, (endsAt - Date.now()) / 1000));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  useEffect(() => {
    if (remaining > 0 || firedRef.current) return;
    firedRef.current = true;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([120, 60, 120]);
  }, [remaining]);

  const done = remaining <= 0;
  const percent = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;

  return (
    <div className="overflow-hidden rounded-card bg-blush text-blush-foreground shadow-float">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs opacity-75">{done ? "Pause vorbei" : "Pause"}</p>
          <p className="nums text-heading-sm leading-none">{formatClock(remaining)}</p>
        </div>

        {/* Minus und Plus rahmen die Pause ein — verkürzen ist genauso normal
            wie verlängern, wenn ein Satz leichter lief als gedacht. */}
        <div className="flex shrink-0 items-center rounded-pill bg-current/10">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onExtend(-30)}
            disabled={done}
            aria-label="Pause um 30 Sekunden verkürzen"
            className="text-blush-foreground hover:bg-current/10"
          >
            <Minus />
          </Button>
          <span className="px-0.5 text-xs opacity-75">30s</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onExtend(30)}
            aria-label="Pause um 30 Sekunden verlängern"
            className="text-blush-foreground hover:bg-current/10"
          >
            <Plus />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="shrink-0 text-blush-foreground hover:bg-current/10"
        >
          <SkipForward />
          {done ? "Weiter" : "Überspringen"}
        </Button>
      </div>

      <div className="h-1 w-full bg-current/15">
        <div
          className="h-full bg-current transition-[width] duration-200 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
