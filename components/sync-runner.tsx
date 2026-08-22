"use client";

import { useCallback, useEffect } from "react";
import { flushOutbox } from "@/lib/outbox";
import { flushQueue } from "@/lib/write-queue";
import { syncOnce } from "@/lib/sync";

/**
 * Hält den lokalen Bestand mit dem Server im Gleichklang.
 *
 * Reihenfolge ist nicht beliebig: erst senden, dann holen. Andersherum käme
 * eine gerade abgeschlossene Einheit im frisch geholten Stand noch nicht vor,
 * und der lokale Bestand wäre für einen Moment älter als das, was das Gerät
 * selbst weiß.
 *
 * Sitzt in der Wurzel, nicht in einem Bereich der App: der Abgleich gilt für
 * alles, und eine wartende Änderung soll auch rausgehen, wenn die App auf dem
 * Dashboard geöffnet wird.
 *
 * Ausgelöst beim Start, bei zurückkehrender Verbindung und beim Zurückkehren
 * zur App — auf dem Handy kommt der Empfang oft wieder, während die App im
 * Hintergrund liegt, und das online-Ereignis feuert dann nicht zuverlässig.
 */
export function SyncRunner() {
  const run = useCallback(async () => {
    try {
      await flushOutbox();
      await flushQueue();
      await syncOnce();
    } catch {
      // Ohne Netz ist das der Normalfall, kein Fehler. Der nächste Auslöser
      // versucht es erneut; bis dahin arbeitet die App mit dem lokalen Stand.
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };

    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [run]);

  return null;
}
