/**
 * Damit LuHabit im Gym auch ohne Empfang aufgeht.
 *
 * Ohne Service Worker holt Safari bei jedem Start das HTML aus dem Netz — im
 * Keller ohne Balken kommt dann die Fehlerseite statt der laufenden Einheit.
 * Deshalb: alles, was einmal geladen wurde, liegt hier im Cache und dient als
 * Rückfallebene. Das Netz gewinnt trotzdem immer, wenn es da ist.
 *
 * VERSION hochzählen, sobald sich die Strategie unten ändert — beim Aktivieren
 * fliegen alle Caches mit anderem Namen raus.
 */

const VERSION = "v1";
const STATIC_CACHE = `luhabit-static-${VERSION}`;
const PAGE_CACHE = `luhabit-pages-${VERSION}`;
const KEEP = [STATIC_CACHE, PAGE_CACHE];

/** Die Seite, die offline einspringt, wenn genau diese Adresse nie geladen wurde. */
const FALLBACK = "/training";

/**
 * Diese Seiten werden gleich beim Installieren geholt, nicht erst beim ersten
 * Besuch. Sonst wäre die laufende Einheit ausgerechnet dann nicht abrufbar,
 * wenn man sie zum ersten Mal offline braucht.
 */
const WARMUP = ["/", "/training", "/training/session", "/training/emom"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      await Promise.all(
        WARMUP.map(async (path) => {
          try {
            const response = await fetch(path, { credentials: "same-origin" });
            if (isCacheable(response)) await cache.put(path, response);
          } catch {
            // Kein Netz beim Installieren — die Seite landet beim ersten Besuch im Cache
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Beim Abmelden dürfen keine fremden Daten im Cache zurückbleiben.
self.addEventListener("message", (event) => {
  if (event.data === "luhabit-clear-cache") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

/** Gehashte Build-Dateien ändern sich nie unter derselben Adresse. */
function isImmutable(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:woff2?|png|jpe?g|svg|ico)$/.test(url.pathname)
  );
}

/** Nur vollständige, eigene Antworten gehören in den Cache. */
function isCacheable(response) {
  return response && response.ok && !response.redirected && response.type === "basic";
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (isCacheable(response)) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName, isNavigation) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (!isNavigation) throw error;

    // Beim Seitenaufruf zählt nur der Pfad: /training/session?day=push liefert
    // dieselbe Seite wie ?day=pull, den Tag holt sich die App danach selbst.
    // Bei Daten-Adressen wäre dieselbe Nachsicht falsch — da steckt der Inhalt
    // in den Parametern.
    const byPath = await cache.match(request, { ignoreSearch: true });
    if (byPath) return byPath;

    const shell = await cache.match(FALLBACK);
    if (shell) return shell;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Der Anmeldefluss lebt von echten Weiterleitungen und Cookies — der darf
  // nie aus dem Cache kommen.
  if (url.pathname.startsWith("/api/auth/")) return;

  if (isImmutable(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Seiten, RSC-Antworten und Daten-Endpunkte: erst das Netz, dann der Cache.
  // Beim Seitenaufruf springt notfalls die Trainingsübersicht ein, damit statt
  // der Browser-Fehlerseite die App erscheint.
  event.respondWith(networkFirst(request, PAGE_CACHE, request.mode === "navigate"));
});
