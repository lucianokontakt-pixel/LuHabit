"use client";

import { useEffect } from "react";

/**
 * Meldet den Service Worker an, der die App offline startfähig macht.
 *
 * Nur im fertigen Build: in der Entwicklung sind die Dateien unter
 * /_next/static nicht unveränderlich, ein Cache davor würde alte Chunks
 * ausliefern und jede Änderung unsichtbar machen.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ohne Service Worker läuft die App weiter, nur eben nicht offline
    });
  }, []);

  return null;
}
