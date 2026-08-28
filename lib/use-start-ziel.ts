"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useTraining } from "@/lib/training-store";
import { nextDayFor } from "@/lib/training";
import {
  abonniereEntwurf,
  entwurfRoh,
  entwurfStand,
  keinEntwurfRoh,
  type EntwurfStand,
} from "@/lib/session-draft";

/**
 * Die angefangene Einheit — oder null.
 *
 * Der Schnappschuss ist der rohe Text aus dem Speicher; das Auswerten steht im
 * useMemo dahinter. Andersherum bekäme useSyncExternalStore bei jedem Render ein
 * neues Objekt und React drehte sich im Kreis.
 */
export function useEntwurf(): EntwurfStand | null {
  const raw = useSyncExternalStore(abonniereEntwurf, entwurfRoh, keinEntwurfRoh);
  return useMemo(() => entwurfStand(raw), [raw]);
}

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
  const entwurf = useEntwurf();

  const naechster = activePlan ? nextDayFor(activePlan, sessions[0]) : null;
  // Ein offener Entwurf schlägt den Vorschlag: wer mitten in einer Einheit
  // steht, will dorthin zurück und keine neue anfangen.
  const zielTag = entwurf?.dayId ?? naechster?.id ?? null;

  return {
    // Ohne Plan gibt es nichts zu starten — dann führt der Knopf dorthin, wo man
    // einen anlegt, statt in eine Seite, die "Tag nicht gefunden" sagt.
    ziel: zielTag ? `/session?day=${encodeURIComponent(zielTag)}` : "/plaene",
    laeuft: entwurf !== null,
  };
}
