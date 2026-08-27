"use client";

import { useSyncExternalStore } from "react";
import { useTraining } from "@/lib/training-store";
import { nextDayFor } from "@/lib/training";
import { abonniereEntwurf, keinEntwurf, offenerEntwurfTag } from "@/lib/session-draft";

/**
 * Wohin der Start-Knopf führt und wie er heißt.
 *
 * Zwei Stellen brauchen dieselbe Antwort: der Kreis in der unteren Leiste auf
 * dem Handy und der Knopf oben rechts auf dem Desktop. Vorher stand die
 * Rechnung zweimal da — und hätte sich beim nächsten Anfassen auseinander
 * entwickelt.
 */
export function useStartZiel(): { ziel: string; laeuft: boolean } {
  const { activePlan, sessions } = useTraining();

  /**
   * Läuft schon eine Einheit? Der Entwurf liegt in localStorage — ein externer
   * Speicher, für den es useSyncExternalStore gibt. Auf dem Server kommt null
   * heraus, im Browser der echte Stand; damit weicht die Hydration nicht ab.
   */
  const offenerTag = useSyncExternalStore(abonniereEntwurf, offenerEntwurfTag, keinEntwurf);

  const naechster = activePlan ? nextDayFor(activePlan, sessions[0]) : null;
  // Ein offener Entwurf schlägt den Vorschlag: wer mitten in einer Einheit
  // steht, will dorthin zurück und keine neue anfangen.
  const zielTag = offenerTag ?? naechster?.id ?? null;

  return {
    // Ohne Plan gibt es nichts zu starten — dann führt der Knopf dorthin, wo man
    // einen anlegt, statt in eine Seite, die "Tag nicht gefunden" sagt.
    ziel: zielTag ? `/session?day=${encodeURIComponent(zielTag)}` : "/plaene",
    laeuft: offenerTag !== null,
  };
}
