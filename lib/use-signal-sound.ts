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
 * Ein Umweg über ein <video>-Element (um iOS' Stummschalter zu umgehen, wie
 * bei YouTube) wurde ausprobiert, klang aber hörbar schlechter — der Ton lief
 * dabei durch die Videowiedergabe-Pipeline statt direkt raus.
 *
 * Der Stummschalter wird stattdessen über die Audio Session API abgehandelt —
 * siehe SESSION_TYPE. Das ist der Grund, warum in der Halle nichts zu hören
 * war, und der einzige Weg dorthin, der den Klang nicht verschlechtert.
 */

/**
 * `navigator.audioSession` steht noch in keiner TypeScript-Bibliothek, gibt es
 * aber seit Safari 16.4. Nur das eine Feld, das wir setzen.
 */
type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string };
};

/**
 * Die Sitzungsart für den Ton.
 *
 * 'playback' ist die einzige, die am Klingelschalter des iPhones vorbeikommt.
 * Alles andere — 'auto', 'ambient', 'transient' — behandelt die Seite wie
 * einen Klingelton und schweigt, sobald der Schalter auf lautlos steht. In
 * einer Halle steht er das immer. Ein Versuch mit 'transient', das fremde
 * Musik nur ducken statt unterbrechen sollte, ergab genau deshalb gar keinen
 * Ton mehr.
 *
 * Der Preis von 'playback' ist, dass iOS dafür das Feld räumt: laufende Musik
 * wird unterbrochen, nicht leiser gemacht. Das ist verkraftbar, solange die
 * Unterbrechung *endet* — dann meldet iOS „interruption ended, du darfst
 * weiterspielen“ und Spotify macht von allein weiter.
 *
 * Genau das fehlte: die Sitzungsart wurde beim ersten abgehakten Satz gesetzt
 * und nie zurückgenommen, also endete die Unterbrechung nie. Sie gilt jetzt
 * nur um den Ton herum (siehe play) und fällt danach auf 'auto' zurück.
 */
const SESSION_TYPE = "playback";

/**
 * Wie lange nach dem letzten Oszillator die Sitzungsart stehen bleibt, bevor
 * sie auf 'auto' zurückfällt. Ohne diese Rückgabe endet die Unterbrechung nie.
 * Etwas Luft, damit das Zurücksetzen nicht in den ausklingenden Ton fällt.
 */
const SESSION_RELEASE_MS = 400;

export function useSignalSound() {
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);
  const releaseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
   *
   * Die Sitzungsart wird hier bewusst *nicht* gesetzt: sie gilt nur um den Ton
   * herum (siehe play), sonst hielte ein einziger abgehakter Satz die Musik
   * für die ganze Einheit unten.
   */
  const unlock = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!contextRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        contextRef.current = new Ctor();
      }
      if (contextRef.current.state !== "running") void contextRef.current.resume();
    } catch {
      // Ohne Audio läuft der Timer trotzdem — die Vibration bleibt.
    }
  }, []);

  /**
   * Holt den Kontext zurück, wenn iOS ihn weggelegt hat.
   *
   * Nach einer Unterbrechung — ein Anruf, ein Wechsel in den Hintergrund, der
   * eigene Ton über fremder Musik — steht der Kontext auf "suspended" oder auf
   * Safaris eigenem "interrupted". Vorher stieg play() an dieser Stelle still
   * aus und die App blieb für den Rest der Einheit stumm.
   */
  useEffect(() => {
    const wecken = () => {
      const ctx = contextRef.current;
      if (ctx && ctx.state !== "running" && ctx.state !== "closed") void ctx.resume();
    };
    document.addEventListener("visibilitychange", wecken);
    return () => document.removeEventListener("visibilitychange", wecken);
  }, []);

  const play = useCallback(
    (signal: Signal) => {
      if (!enabled) return;
      const ctx = contextRef.current;
      if (!ctx || ctx.state === "closed") return;

      // Erst die Sitzungsart, dann aufwecken: ein Wechsel der Kategorie kann
      // den Kontext selbst kurz unterbrechen, und was davor geplant wurde,
      // fiele dabei aus.
      try {
        const nav = navigator as AudioSessionNavigator;
        if (nav.audioSession) nav.audioSession.type = SESSION_TYPE;
      } catch {
        // Ohne Audio Session API klingt es wie vorher — nur eben am
        // Stummschalter des iPhones.
      }

      // Weggelegt heißt nicht verloren: aufwecken und trotzdem spielen. Die
      // Töne werden auf ctx.currentTime geplant, das läuft nach dem resume
      // weiter — schlimmstenfalls kommt der Ton einen Wimpernschlag später.
      if (ctx.state !== "running") void ctx.resume();

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

        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + tone.duration);
        offset += tone.duration + 0.05;
      }

      // Das Feld wieder freigeben — das ist der eigentliche Fix. Ohne diese
      // Zeile bliebe fremde Musik unterbrochen, bis jemand die Seite verlässt,
      // und Spotify erführe nie, dass es weitergehen darf.
      if (releaseRef.current) clearTimeout(releaseRef.current);
      releaseRef.current = setTimeout(() => {
        try {
          const nav = navigator as AudioSessionNavigator;
          if (nav.audioSession) nav.audioSession.type = "auto";
        } catch {
          // dann eben nicht
        }
      }, offset * 1000 + SESSION_RELEASE_MS);
    },
    [enabled]
  );

  useEffect(() => {
    return () => {
      if (releaseRef.current) clearTimeout(releaseRef.current);
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  /**
   * Einmal hören, was am Ende der Pause kommt — ohne eine Pause abzuwarten.
   *
   * Der Ton hängt an Dingen, die sich nur am Gerät zeigen: am Klingelschalter,
   * an der Sitzungsart, an laufender Musik. Ihn nur über einen echten
   * Pausentimer prüfen zu können hieß, für jede Änderung eine Einheit zu
   * starten und Minuten zu warten.
   */
  const test = useCallback(() => {
    unlock();
    // Der Kontext wird im selben Tap erzeugt; ein Sprung durch die Ereignis-
    // schleife gibt ihm die Gelegenheit, wirklich zu laufen, bevor der Ton
    // geplant wird.
    setTimeout(() => play("finish"), 60);
  }, [unlock, play]);

  return { enabled, toggle, unlock, play, test };
}
