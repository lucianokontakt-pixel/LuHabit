"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeQueue } from "@/lib/write-queue";

export type SyncStatus = {
  /** navigator.onLine — nicht "erreichbar", nur "hat eine Verbindung". */
  online: boolean;
  /** Wie viele Änderungen noch auf das Senden warten. */
  pending: number;
  /**
   * Wie viele der Server abgelehnt hat. Sie warten nicht mehr — sie liegen
   * und brauchen eine Entscheidung. Der wichtigste der drei Zustände, weil er
   * als einziger nicht von selbst weggeht.
   */
  failed: number;
  /**
   * War gerade eben noch etwas offen und ist jetzt fertig. Blendet sich nach
   * ein paar Sekunden von selbst wieder aus — eine Bestätigung, kein
   * Dauerzustand, den man wegklicken müsste.
   */
  justSynced: boolean;
};

const JUST_SYNCED_MS = 3000;

/**
 * Live-Status für die Anzeige "läuft gerade offline, wartet noch auf Sync,
 * oder ist alles durch". Baut auf zwei vorhandenen Signalen auf, erfindet
 * keinen dritten Zustand: online/offline kommt vom Browser, "wartet noch"
 * von der Schreib-Warteschlange (lib/write-queue.ts).
 */
export function useSyncStatus(): SyncStatus {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [justSynced, setJustSynced] = useState(false);
  const wasPendingRef = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Startwert erst im Browser bekannt
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(
    () =>
      subscribeQueue((targets, failedCount) => {
        setPending(targets.size);
        setFailed(failedCount);
        if (targets.size > 0) {
          wasPendingRef.current = true;
          setJustSynced(false);
          if (fadeTimer.current) clearTimeout(fadeTimer.current);
        } else if (wasPendingRef.current) {
          // Von "wartet noch" auf "nichts mehr offen" — das ist der Moment,
          // der eine kurze Bestätigung verdient.
          wasPendingRef.current = false;
          setJustSynced(true);
          fadeTimer.current = setTimeout(() => setJustSynced(false), JUST_SYNCED_MS);
        }
      }),
    []
  );

  // Ein Abgleich (nicht nur die eigene Warteschlange) kann ebenfalls die
  // Schlange leeren, z.B. wenn eine wartende Änderung gerade durchgegangen
  // ist, während diese Komponente noch nicht montiert war. subscribeQueue
  // deckt das schon ab; dieser zweite Effekt sorgt nur dafür, dass der Timer
  // beim Verlassen der Seite nicht weiterläuft.
  useEffect(() => {
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  return { online, pending, failed, justSynced };
}
