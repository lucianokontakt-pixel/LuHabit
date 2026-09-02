"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { discardFailed, readFailed, retryFailed, subscribeQueue } from "@/lib/write-queue";
import type { FailedOp } from "@/lib/local-db";
import { formatDateLong } from "@/lib/format";

/**
 * Was der Server abgelehnt hat — und was man damit machen kann.
 *
 * Die Warteschlange nimmt abgelehnte Änderungen heraus, weil ein erneuter
 * Versuch eine Ablehnung nicht heilt und alles dahinter blockieren würde. Bis
 * hierher wurden sie dabei stillschweigend weggeworfen: der Zustand stand
 * lokal schon, die App meldete danach „Synchronisiert", und eine Einheit lag
 * für immer nur auf diesem einen Gerät.
 *
 * Der Abschnitt bleibt unsichtbar, solange nichts abgelehnt wurde — er ist
 * eine Ausnahmemeldung, keine Rubrik.
 */
export function FailedWrites() {
  const [failed, setFailed] = useState<FailedOp[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const laden = useCallback(() => {
    void readFailed().then(setFailed);
  }, []);

  useEffect(() => {
    laden();
    return subscribeQueue(() => laden());
  }, [laden]);

  if (failed.length === 0) return null;

  async function nochmal(eintrag: FailedOp) {
    setBusy(eintrag.seq);
    try {
      await retryFailed(eintrag.seq);
      toast.success("Wird erneut gesendet");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hat wieder nicht geklappt");
    } finally {
      setBusy(null);
      laden();
    }
  }

  async function verwerfen(eintrag: FailedOp) {
    setBusy(eintrag.seq);
    try {
      await discardFailed(eintrag.seq);
      toast.success("Verworfen");
    } finally {
      setBusy(null);
      laden();
    }
  }

  return (
    <Section
      title="Nicht gespeichert"
      footer="Diese Änderungen stehen auf diesem Gerät, haben den Server aber nie erreicht. Erneut senden hilft, wenn der Grund inzwischen weg ist — sonst verwerfen, dann gilt der Stand vom Server."
    >
      {failed.map((eintrag) => (
        <div
          key={eintrag.seq}
          className="flex flex-col gap-2 border-b border-border px-(--card-spacing) py-3 last:border-0"
        >
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{beschreibung(eintrag)}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                {eintrag.reason}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatDateLong(eintrag.failedAt.slice(0, 10))}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pl-6.5">
            <Button
              variant="outline"
              size="sm"
              disabled={busy === eintrag.seq}
              onClick={() => nochmal(eintrag)}
            >
              <RotateCcw className="size-4" />
              Erneut senden
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy === eintrag.seq}
              onClick={() => verwerfen(eintrag)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Verwerfen
            </Button>
          </div>
        </div>
      ))}
    </Section>
  );
}

/** Woran man den Datensatz wiedererkennt, ohne die Operation zu kennen. */
function beschreibung(eintrag: FailedOp): string {
  const op = eintrag.op;
  switch (op.kind) {
    case "session.save":
      return `Einheit „${op.session.dayName}" vom ${formatDateLong(op.session.date)}`;
    case "session.delete":
      return "Gelöschte Einheit";
    case "plan.save":
      return `Plan „${op.plan.name}"`;
    case "plan.delete":
      return "Gelöschter Plan";
    case "planExercise.swap":
      return `Getauschte Übung im Plan „${op.plan.name}"`;
    case "exercise.save":
      return `Übung „${op.exercise.name}"`;
    case "exercise.delete":
      return "Gelöschte Übung";
    case "entry.set":
      return `Messwert vom ${formatDateLong(op.entry.date)}`;
  }
}
