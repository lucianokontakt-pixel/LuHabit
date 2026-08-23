"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "luhabit-signal-sound";

type Signal = "countdown" | "start" | "finish";

/** Kurze, klare Signaltöne — tief für den Countdown, hoch für den Rundenstart. */
const TONES: Record<Signal, { frequency: number; duration: number }[]> = {
  countdown: [{ frequency: 660, duration: 0.09 }],
  start: [{ frequency: 990, duration: 0.22 }],
  finish: [
    { frequency: 660, duration: 0.14 },
    { frequency: 880, duration: 0.14 },
    { frequency: 1180, duration: 0.32 },
  ],
};

/**
 * Signaltöne für Timer in der App — EMOM und die Trainingspause teilen sich
 * denselben Klang und dieselbe An/Aus-Einstellung, synthetisch über die Web
 * Audio API.
 *
 * Keine Audiodateien: die Töne sind zwei Sinusrampen lang, das lohnt keinen
 * Download und funktioniert offline. Der AudioContext wird erst beim ersten
 * Nutzer-Tap erzeugt und entsperrt — vorher blockieren Browser jede Tonausgabe.
 *
 * Der Ton läuft über ein unsichtbares <video>-Element statt direkt zum
 * Lautsprecher: iOS Safari hält sich bei reinem Web-Audio-Ton an den
 * Stummschalter am Gehäuse, bei einem Video mit Ton dagegen nicht (genauso
 * bei YouTube in Safari). Ein MediaStreamAudioDestinationNode nimmt das
 * Ergebnis der Sinusrampen ab und speist es als "Video" ein — der erzeugte
 * Ton bleibt exakt derselbe, nur der Ausgang ändert sich. Das ist ein
 * bekannter, nicht von Apple dokumentierter Kniff und kann mit einer
 * iOS-Version aufhören zu funktionieren; ohne ihn bliebe der Ton bei
 * aktiviertem Stummschalter aber so oder so aus.
 */
export function useSignalSound() {
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- liest die Einstellung einmalig beim Mount
      if (stored !== null) setEnabled(stored === "1");
    } catch {
      // Kein Speicher, kein Problem — dann bleibt es beim Standard
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Einstellung gilt dann nur für diese Sitzung
      }
      return next;
    });
  }, []);

  /**
   * Muss aus einem echten Tap heraus laufen. Danach darf der Ton auch aus
   * einem Timer kommen — ohne diese Freigabe bleibt der Kontext "suspended"
   * und jeder spätere Ton fiele lautlos aus.
   */
  const unlock = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!contextRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        contextRef.current = ctx;
        destinationRef.current = ctx.createMediaStreamDestination();

        const video = document.createElement("video");
        video.srcObject = destinationRef.current.stream;
        video.muted = false;
        video.playsInline = true;
        video.setAttribute("playsinline", "true");
        // Unsichtbar, aber nicht display:none — manche Browser pausieren
        // Medien, die gar nicht gerendert werden.
        Object.assign(video.style, {
          position: "fixed",
          width: "1px",
          height: "1px",
          opacity: "0",
          pointerEvents: "none",
        });
        document.body.appendChild(video);
        videoRef.current = video;
      }
      if (contextRef.current.state === "suspended") void contextRef.current.resume();
      void videoRef.current?.play().catch(() => {
        // Kein Video-Ton möglich — play() greift dann direkt auf den
        // AudioContext zu, der Ton respektiert in dem Fall den Stummschalter.
      });
    } catch {
      // Ohne Audio läuft der Timer trotzdem — die Vibration bleibt.
    }
  }, []);

  const play = useCallback(
    (signal: Signal) => {
      if (!enabled) return;
      const ctx = contextRef.current;
      if (!ctx || ctx.state !== "running") return;
      const output = destinationRef.current ?? ctx.destination;

      let offset = 0;
      for (const tone of TONES[signal]) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = tone.frequency;

        const startAt = ctx.currentTime + offset;
        // Kurze Ein- und Ausblende: ein hart geschalteter Sinus knackt.
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(0.28, startAt + 0.012);
        gain.gain.setValueAtTime(0.28, startAt + tone.duration - 0.03);
        gain.gain.linearRampToValueAtTime(0, startAt + tone.duration);

        oscillator.connect(gain).connect(output);
        oscillator.start(startAt);
        oscillator.stop(startAt + tone.duration);
        offset += tone.duration + 0.05;
      }
    },
    [enabled]
  );

  useEffect(() => {
    return () => {
      void contextRef.current?.close();
      contextRef.current = null;
      destinationRef.current = null;
      videoRef.current?.remove();
      videoRef.current = null;
    };
  }, []);

  return { enabled, toggle, unlock, play };
}
