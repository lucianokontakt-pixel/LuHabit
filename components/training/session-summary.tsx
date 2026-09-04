"use client";

import { Trophy, Timer, Layers, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatValue } from "@/components/stat-value";
import { MUSCLE_LABELS, type Muscle } from "@/lib/training";
import { RECORD_LABELS, type SessionSummary as Summary } from "@/lib/session-stats";
import { formatCompact, formatDateLong, formatNumber, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MUSCLE_TINT, TINT_FILL, tintForMuscles } from "@/lib/tints";

function minutes(seconds: number | null): string {
  if (seconds === null) return "—";
  return String(Math.max(1, Math.round(seconds / 60)));
}

/**
 * Was aus einer Einheit geworden ist. Steht direkt nach dem Training als
 * Belohnung und später im Verlauf als Nachschlagewerk — deshalb ein Bauteil
 * statt zweier, die auseinanderlaufen.
 *
 * `hero` unterscheidet die beiden Auftritte, und die Tönung sagt, welcher es
 * ist: direkt nach dem letzten Satz Mint — die Farbe des Erledigten, wie die
 * abgehakten Sätze eine Bildschirmhöhe weiter oben. Im Archiv dagegen die
 * Tönung der Muskelfamilie, dieselbe, die die Kachel auf der Startseite trug,
 * über die man hergekommen ist. Die Farbe trägt einen also durch.
 */
export function SessionSummary({
  summary,
  hero = false,
  headline,
  children,
}: {
  summary: Summary;
  hero?: boolean;
  headline?: string;
  children?: React.ReactNode;
}) {
  const { session } = summary;
  const muscleRows = Object.entries(summary.setsByMuscle)
    .map(([key, sets]) => ({ key: key as Muscle, sets }))
    .sort((a, b) => b.sets - a.sets);
  const maxMuscleSets = Math.max(...muscleRows.map((r) => r.sets), 1);
  /* Jeder Muskel so oft, wie er Sätze hatte: gefragt ist, woran die Einheit
     überwiegend gearbeitet hat, nicht welche Muskeln überhaupt vorkamen. */
  const tint = hero
    ? "mint"
    : tintForMuscles(muscleRows.flatMap((r) => Array<Muscle>(r.sets).fill(r.key)));

  return (
    <div className="flex flex-col gap-4">
      <Card variant="tint" tint={tint} className="gap-4">
        <div className="px-(--card-spacing)">
          {/* Wenn die Überschrift schon der Tagesname ist (im Archiv), steht
              hier nur das Datum. Sonst stünde „Upper" zweimal untereinander. */}
          <p className="text-sm opacity-75">
            {headline === session.dayName
              ? formatDateLong(session.date)
              : `${session.dayName} · ${formatDateLong(session.date)}`}
          </p>
          <p className="font-display text-4xl leading-none tracking-tight sm:text-heading">
            {headline ?? "Geschafft!"}
          </p>
          <p className="mt-2 text-sm opacity-75">
            {summary.sets} {summary.sets === 1 ? "Satz" : "Sätze"} ·{" "}
            {formatNumber(summary.reps)} Wiederholungen ·{" "}
            {formatNumber(Math.round(summary.volume))} kg bewegt
          </p>
        </div>

        {children && <div className="px-(--card-spacing)">{children}</div>}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue
              label="Volumen"
              value={formatCompact(Math.round(summary.volume))}
              unit="kg"
              delta={summary.volumeDelta !== null ? Math.round(summary.volumeDelta) : null}
              deltaUnit="kg"
              deltaLabel="vs. letztes Mal"
              direction="up-good"
            />
          </div>
        </Card>
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue label="Dauer" value={minutes(summary.durationSeconds)} unit="min" />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Timer className="size-3 shrink-0" />
              {summary.durationSeconds === null ? "nachgetragen" : "im Gym"}
            </p>
          </div>
        </Card>
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue label="Sätze" value={String(summary.sets)} />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Layers className="size-3 shrink-0" />
              {summary.exercises.length}{" "}
              {summary.exercises.length === 1 ? "Übung" : "Übungen"}
            </p>
          </div>
        </Card>
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue
              label="Dichte"
              value={summary.density !== null ? formatNumber(Math.round(summary.density)) : "—"}
              unit={summary.density !== null ? "kg/min" : undefined}
            />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Gauge className="size-3 shrink-0" />
              {formatNumber(summary.reps)} Wdh
            </p>
          </div>
        </Card>
      </div>

      {summary.records.length > 0 && (
        <Card className="gap-3">
          <div className="flex items-center gap-2 px-(--card-spacing)">
            <Trophy className="size-4 shrink-0 text-muted-foreground" />
            <h2 className="text-subheading font-display">
              {summary.records.length === 1
                ? "Eine neue Bestleistung"
                : `${summary.records.length} neue Bestleistungen`}
            </h2>
          </div>
          <div className="flex flex-col gap-2 px-(--card-spacing)">
            {summary.records.map(({ exercise, kind }) => (
              <div
                key={exercise.exerciseId}
                className="flex items-center gap-3 rounded-panel bg-elevated px-3.5 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium">{exercise.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {RECORD_LABELS[kind]}
                  </span>
                </span>
                <span className="nums shrink-0 text-right text-sm">
                  {kind === "reps"
                    ? `${exercise.topReps} Wdh`
                    : kind === "volume"
                      ? `${formatCompact(Math.round(exercise.volume))} kg`
                      : kind === "oneRm"
                        ? `${formatNumber(exercise.oneRm)} kg`
                        : `${formatNumber(exercise.topWeight)} kg`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {muscleRows.length > 0 && (
        <Card className="gap-3">
          <div className="px-(--card-spacing)">
            <h2 className="text-subheading font-display">Was gearbeitet hat</h2>
            <p className="text-sm text-muted-foreground">Sätze je Muskelgruppe</p>
          </div>
          <div className="flex flex-col gap-2 px-(--card-spacing)">
            {muscleRows.map((row) => (
              <div key={row.key} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">
                  {MUSCLE_LABELS[row.key]}
                </span>
                {/* Jeder Balken in der Farbe seiner Familie statt fünfmal
                    dasselbe Violett. Die Zeile sagt ohnehin, welcher Muskel
                    gemeint ist — die Farbe macht daraus ein Bild, in dem man
                    eine Schieflage sieht, ohne die Namen zu lesen. */}
                <div className="h-2 flex-1 overflow-hidden rounded-pill bg-elevated">
                  <div
                    className={cn("h-full rounded-pill", TINT_FILL[MUSCLE_TINT[row.key]])}
                    style={{ width: `${(row.sets / maxMuscleSets) * 100}%` }}
                  />
                </div>
                <span className="nums w-10 shrink-0 text-right text-xs text-muted-foreground">
                  {row.sets}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="gap-3">
        <div className="px-(--card-spacing)">
          <h2 className="text-subheading font-display">Übungen</h2>
          <p className="text-sm text-muted-foreground">
            Bester Satz und Veränderung zur letzten Einheit mit dieser Übung
          </p>
        </div>
        <div className="flex flex-col px-(--card-spacing)">
          {summary.exercises.map((exercise) => {
            const weightDelta = exercise.previous
              ? exercise.topWeight - exercise.previous.topWeight
              : null;
            const repDelta = exercise.previous
              ? exercise.topReps - exercise.previous.topReps
              : null;
            // Bei gleichem Gewicht ist die Wiederholung die Neuigkeit — genau
            // die Logik, mit der auch die Progression rechnet.
            const shown =
              weightDelta !== null && weightDelta !== 0
                ? { value: weightDelta, unit: "kg" }
                : repDelta !== null && repDelta !== 0
                  ? { value: repDelta, unit: "Wdh" }
                  : null;

            return (
              <div
                key={exercise.exerciseId}
                className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="line-clamp-2 text-sm font-medium">{exercise.name}</span>
                    {exercise.records.length > 0 && (
                      <Trophy className="size-3 shrink-0 text-muted-foreground" />
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {exercise.sets} × {exercise.topReps} ·{" "}
                    {exercise.topWeight > 0
                      ? `${formatNumber(exercise.topWeight)} kg`
                      : "Körpergewicht"}
                  </span>
                </span>
                <span className="nums shrink-0 text-right text-xs">
                  {shown ? (
                    <span className={shown.value > 0 ? "text-success" : "text-muted-foreground"}>
                      {formatSigned(shown.value, 1)} {shown.unit}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">
                      {exercise.previous ? "±0" : "erstes Mal"}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
