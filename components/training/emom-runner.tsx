"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useSignalSound } from "@/lib/use-signal-sound";
import {
  COUNTDOWN_FROM,
  buildSegments,
  formatSeconds,
  nextBoundaryElapsed,
  phaseAt,
  roundStartElapsed,
  totalDuration,
  type EmomSegment,
  type EmomTemplate,
} from "@/lib/emom";
import { cn } from "@/lib/utils";

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
}

/**
 * "Pause" ist kein gespeicherter Text, sondern eine Eigenschaft des Segments.
 * Wiederholungen stehen als "12×" davor — dieselbe Schreibweise wie bei den
 * Sätzen im Trainingsprotokoll.
 */
function segmentText(segment: EmomSegment | null | undefined): string {
  if (!segment) return "";
  if (segment.kind === "rest") return "Pause";
  return [segment.reps ? `${segment.reps}×` : null, segment.label || null]
    .filter(Boolean)
    .join(" ");
}

/**
 * Der laufende Durchgang.
 *
 * Die Zeit kommt aus der Wanduhr, nicht aus gezählten Ticks: schläft das Handy
 * oder drosselt der Browser den Timer im Hintergrund, stimmt der Abschnitt
 * beim Zurückkehren trotzdem. Verpasste Töne werden nicht nachgeholt — sie
 * wären dann ohnehin zur falschen Zeit. Springen (Überspringen, Runde vor/
 * zurück) funktioniert nach demselben Prinzip: nicht die verstrichene Zeit
 * wird verändert, sondern der Bezugspunkt, von dem aus sie gerechnet wird.
 */
export function EmomRunner({
  template,
  onClose,
  sound,
}: {
  template: EmomTemplate;
  onClose: () => void;
  /**
   * Von der Elternkomponente durchgereicht statt hier per useSignalSound()
   * selbst erzeugt: der AudioContext lässt sich nur innerhalb eines echten
   * Fingertipps entsperren (iOS-Vorgabe), und dieser Tipp ist der Klick auf
   * "Start", der diese Komponente überhaupt erst einhängt. Ein unlock() in
   * einem Mount-Effekt hier drin kommt für iOS zu spät — der Effekt läuft
   * erst, nachdem React den Tipp längst abgearbeitet und übermalt hat, und
   * zählt dann nicht mehr als Nutzergeste. Der Ton blieb deshalb die ganze
   * Runde stumm, unabhängig vom Stummschalter.
   */
  sound: ReturnType<typeof useSignalSound>;
}) {
  const { enabled: soundOn, toggle: toggleSound, unlock, play } = sound;

  const segments = useMemo(() => buildSegments(template), [template]);
  const total = useMemo(() => totalDuration(template, segments), [template, segments]);

  const [running, setRunning] = useState(true);
  // Beim Start um die bereits verstrichene Zeit zurückdatiert, damit Pausieren
  // und Fortsetzen ohne zweite Zeitquelle auskommen.
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [frozen, setFrozen] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const lastSegmentRef = useRef(-1);
  const lastCountdownRef = useRef(-1);
  const finishedRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed((Date.now() - startedAt) / 1000);
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [running, startedAt]);

  const phase = phaseAt(template, elapsed, segments);
  const done = phase.kind === "done";

  const requestWakeLock = useCallback(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (wakeLockRef.current) return;
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        wakeLockRef.current = lock;
      })
      .catch(() => {
        // Abgelehnt (z. B. wenig Akku) — kein Grund, den Timer zu stoppen.
      });
  }, []);

  // Hält den Bildschirm an, solange der Durchgang läuft — sonst schläft das
  // Display irgendwann ein und reißt Ton und Vibration mit sich. Manche
  // Browser (u. a. Safari vor iOS 16.4) kennen die API nicht; dann läuft der
  // Timer trotzdem weiter, nur eben ohne diese Absicherung.
  useEffect(() => {
    if (!running || done) return;
    requestWakeLock();
    return () => {
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [running, done, requestWakeLock]);

  // Der Browser hebt den Wake Lock automatisch auf, sobald der Tab in den
  // Hintergrund geht — beim Zurückkommen fordert dieser Handler ihn erneut
  // an, falls der Durchgang in der Zwischenzeit weiterlief.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && running && !done) requestWakeLock();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [running, done, requestWakeLock]);

  // Signale aus der Phase ableiten statt sie mitzuzählen — so kann nichts
  // auseinanderlaufen, wenn die Zeit einmal springt.
  useEffect(() => {
    if (phase.kind === "done") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      play("finish");
      vibrate([200, 100, 200, 100, 400]);
      return;
    }

    finishedRef.current = false;

    if (phase.kind === "work" && phase.segment.index !== lastSegmentRef.current) {
      lastSegmentRef.current = phase.segment.index;
      lastCountdownRef.current = -1;
      play("start");
      vibrate([80, 40, 80]);
      return;
    }

    const second = Math.ceil(phase.remaining);
    if (second <= COUNTDOWN_FROM && second > 0 && second !== lastCountdownRef.current) {
      lastCountdownRef.current = second;
      play("countdown");
      vibrate(40);
    }
  }, [phase, play]);

  /**
   * Bezugspunkt neu setzen, ohne die Wanduhr-Logik zu verlassen. Läuft der
   * Timer, verschiebt sich startedAt; ist er pausiert, verschiebt sich frozen
   * — und elapsed wird sofort mitgesetzt, damit die Anzeige nicht erst auf
   * den nächsten Tick wartet (der im pausierten Zustand nie kommt).
   *
   * Die Referenzen für Signale werden auf den Zielabschnitt vorgespult, damit
   * ein Sprung selbst keinen Ton auslöst — nur echtes Verstreichen der Zeit
   * soll das.
   */
  const seekTo = useCallback(
    (target: number) => {
      unlock();
      const clamped = Math.max(0, Math.min(target, total));
      const landed = phaseAt(template, clamped, segments);
      lastSegmentRef.current = landed.kind === "work" ? landed.segment.index : -1;
      lastCountdownRef.current = -1;
      finishedRef.current = landed.kind === "done";

      if (running) setStartedAt(Date.now() - clamped * 1000);
      else setFrozen(clamped);
      setElapsed(clamped);
    },
    [running, total, template, segments, unlock]
  );

  const skip = useCallback(() => {
    seekTo(nextBoundaryElapsed(template, elapsed, segments));
  }, [seekTo, template, elapsed, segments]);

  const currentRound =
    phase.kind === "prepare" ? 0 : phase.kind === "done" ? template.rounds + 1 : phase.segment.round;
  const canGoBack = currentRound > 1;
  const canGoForward = !done && currentRound < template.rounds;

  const jumpRound = useCallback(
    (delta: 1 | -1) => {
      const target = Math.max(1, Math.min(template.rounds, currentRound + delta));
      seekTo(roundStartElapsed(template, target, segments));
    },
    [currentRound, template, segments, seekTo]
  );

  const togglePause = useCallback(() => {
    unlock();
    if (running) {
      setFrozen((Date.now() - startedAt) / 1000);
      setRunning(false);
    } else {
      // Startzeit um das bereits Verstrichene zurückdatieren — danach stimmt
      // die Wanduhr-Rechnung wieder ohne zweite Zeitquelle.
      setStartedAt(Date.now() - frozen * 1000);
      setRunning(true);
    }
  }, [running, startedAt, frozen, unlock]);

  const restart = useCallback(() => {
    unlock();
    lastSegmentRef.current = -1;
    lastCountdownRef.current = -1;
    finishedRef.current = false;
    setFrozen(0);
    setElapsed(0);
    setStartedAt(Date.now());
    setRunning(true);
  }, [unlock]);

  const overallPercent = total > 0 ? Math.min(100, (Math.min(elapsed, total) / total) * 100) : 0;
  const phasePercent =
    phase.kind === "prepare"
      ? 100 - (phase.remaining / Math.max(1, phase.total)) * 100
      : phase.kind === "work"
        ? 100 - (phase.remaining / Math.max(1, phase.segment.seconds)) * 100
        : 100;

  const isRest = phase.kind === "work" && phase.segment.kind === "rest";
  // Bei einem Schritt pro Runde reicht "Runde 4 von 10". Bei mehreren wäre
  // das irreführend, deshalb stehen Runde und Schritt dort getrennt.
  const stepsPerRound = template.steps.filter((s) => s.seconds > 0).length;
  const headline = done
    ? "Geschafft"
    : phase.kind === "prepare"
      ? "Gleich geht's los"
      : isRest
        ? "Pause"
        : stepsPerRound <= 1
          ? `Runde ${phase.segment.round} von ${template.rounds}`
          : `Runde ${phase.segment.round} von ${template.rounds} · Schritt ${phase.segment.stepIndex + 1} von ${stepsPerRound}`;

  const time = done ? formatSeconds(0) : formatSeconds(phase.remaining);
  const label = phase.kind === "work" && !isRest ? segmentText(phase.segment) : "";
  const nextLabel = phase.kind === "work" && phase.next ? segmentText(phase.next) : null;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "overflow-hidden rounded-card text-blush-foreground shadow-float transition-colors",
          done ? "bg-blush/70" : isRest ? "bg-blush/85" : "bg-blush"
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <p className="truncate text-sm opacity-75">{template.name}</p>
            <p className="mt-0.5 text-sm opacity-75">{headline}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSound}
              aria-label={soundOn ? "Ton ausschalten" : "Ton einschalten"}
              aria-pressed={soundOn}
              className="text-blush-foreground hover:bg-current/10"
            >
              {soundOn ? <Volume2 /> : <VolumeX />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Timer schließen"
              className="text-blush-foreground hover:bg-current/10"
            >
              <X />
            </Button>
          </div>
        </div>

        <div className="px-5 pb-1 pt-2 text-center">
          <p className="nums font-display text-[4.5rem] leading-none tracking-tight tabular-nums sm:text-[6rem]">
            {time}
          </p>
          {label && !done && (
            <p className="mt-3 text-body-lg leading-snug break-words">{label}</p>
          )}
          {done && (
            <p className="mt-3 text-body-lg leading-snug">
              {template.rounds} {template.rounds === 1 ? "Runde" : "Runden"} durch.
            </p>
          )}
        </div>

        <div className="px-5 pb-4 pt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-current/15">
            <div
              className="h-full rounded-pill bg-current transition-[width] duration-100 ease-linear"
              style={{ width: `${phasePercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs opacity-75">
            <span>{nextLabel ? `Als Nächstes: ${nextLabel}` : " "}</span>
            <span className="nums">{Math.round(overallPercent)} %</span>
          </div>
        </div>
      </div>

      {!done && (
        <div className="flex items-center rounded-pill bg-card p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => jumpRound(-1)}
            disabled={!canGoBack}
            aria-label="Vorherige Runde"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={skip}
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            <SkipForward />
            Überspringen
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => jumpRound(1)}
            disabled={!canGoForward}
            aria-label="Nächste Runde"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight />
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        {done ? (
          <Button size="lg" className="flex-1" onClick={restart}>
            <RotateCcw />
            Nochmal
          </Button>
        ) : (
          <Button size="lg" className="flex-1" onClick={togglePause}>
            {running ? <Pause /> : <Play />}
            {running ? "Pause" : "Weiter"}
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={done ? onClose : restart}>
          {done ? "Fertig" : <RotateCcw />}
          {done ? "" : "Neu"}
        </Button>
      </div>
    </div>
  );
}
