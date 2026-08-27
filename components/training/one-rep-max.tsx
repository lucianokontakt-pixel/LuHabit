"use client";

import { useState } from "react";
import { Stepper } from "@/components/training/set-row";
import { ONE_RM_REP_CAP, displayOneRepMax } from "@/lib/training";
import { formatDateLong, formatNumber } from "@/lib/format";

/**
 * Was ginge einmal? — durchgespielt statt ausprobiert.
 *
 * Der Rechner startet bei dem Satz, der die beste Schätzung des Verlaufs
 * hergibt, damit die erste Zahl schon eine Aussage ist und nicht bei 20 kg
 * beginnt. Von dort kann man frei weiterdrehen.
 *
 * Über {@link ONE_RM_REP_CAP} Wiederholungen gibt es bewusst kein Ergebnis: die
 * Epley-Formel ist aus Sätzen bis etwa zwölf gebaut, darüber sagt sie mehr über
 * die Ausdauer als über die Maximalkraft. Lieber nichts als eine Zahl, die man
 * für belastbar hält.
 */
export function OneRepMaxCalculator({
  startWeight,
  startReps,
  best,
}: {
  startWeight: number;
  startReps: number;
  best: { est: number; weight: number; reps: number; date: string } | null;
}) {
  const [weight, setWeight] = useState(startWeight);
  const [reps, setReps] = useState(startReps);
  const estimate = displayOneRepMax(weight, reps);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">Geschätztes Maximum</h3>
        {best ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Aus deinem Verlauf:{" "}
            <span className="nums text-foreground">{formatNumber(best.est)} kg</span> — aus{" "}
            {formatNumber(best.weight)} kg × {best.reps} am {formatDateLong(best.date)}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Noch kein Satz protokolliert — spiel es hier trotzdem durch.
          </p>
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-muted-foreground">Gewicht</span>
          <Stepper
            label="Gewicht"
            value={weight}
            suffix="kg"
            step={2.5}
            onChange={setWeight}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-muted-foreground">Wiederholungen</span>
          <Stepper
            label="Wiederholungen"
            value={reps}
            suffix="×"
            step={1}
            min={1}
            onChange={setReps}
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 rounded-field bg-card px-3 py-2">
        <span className="text-sm text-muted-foreground">Schätzung</span>
        <span className="nums text-subheading font-display leading-none">
          {estimate === null ? "—" : `${formatNumber(estimate)} kg`}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {estimate === null
          ? `Über ${ONE_RM_REP_CAP} Wiederholungen wird die Schätzung zur Raterei — dort misst sie eher Ausdauer als Maximalkraft.`
          : "Epley-Formel, gerechnet aus einem Satz. Eine Schätzung, kein getesteter Maximalversuch."}
      </p>
    </section>
  );
}
