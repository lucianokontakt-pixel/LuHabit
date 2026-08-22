"use client";

import { useEffect } from "react";
import { flushOutbox } from "@/lib/outbox";

/**
 * Schickt ohne Netz abgeschlossene Einheiten nach, sobald wieder Verbindung da
 * ist. Sitzt bewusst in der Wurzel und nicht im Trainings-Store: der lebt nur
 * unter /training, und eine wartende Einheit soll auch rausgehen, wenn die App
 * auf dem Dashboard geöffnet wird.
 *
 * Neben dem online-Ereignis auch beim Zurückkehren zur App — auf dem Handy
 * kommt der Empfang oft zurück, während die App im Hintergrund liegt, und
 * online feuert dann nicht zuverlässig.
 */
export function OutboxSync() {
  useEffect(() => {
    const flush = () => {
      flushOutbox();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") flush();
    };

    flush();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
