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

const VERSION = "v5";
const STATIC_CACHE = `luhabit-static-${VERSION}`;
const PAGE_CACHE = `luhabit-pages-${VERSION}`;
const KEEP = [STATIC_CACHE, PAGE_CACHE];

/** Die Seite, die offline einspringt, wenn genau diese Adresse nie geladen wurde. */
const FALLBACK = "/training";

/**
 * Alle festen Seiten der App werden gleich beim Installieren geholt, nicht erst
 * beim ersten Besuch. Sonst führt genau die eine Seite, die man offline noch
 * nie geöffnet hatte, auf die Rückfallseite — und das ist die Seite, die man
 * dann gerade braucht.
 *
 * Es sind kleine Hüllen: den Inhalt baut die App aus dem lokalen Bestand, hier
 * liegt nur das Gerüst.
 *
 * Nicht dabei und mit Absicht:
 *   /coffee, /water, /steps, /reading, /writing, /habits leiten auf /habit/<id>
 *   bzw. / weiter. Eine Weiterleitung gehört nicht in den Cache, und die Ziele
 *   tragen eine ID, die niemand vorab kennt — die landen beim ersten Besuch im
 *   Cache. Wer eine Habit-Seite offline öffnen will, muss sie einmal mit Netz
 *   geöffnet haben.
 *   /login muss immer aus dem Netz kommen.
 */
const WARMUP = [
  "/",
  "/training",
  "/training/session",
  "/training/emom",
  "/training/plaene",
  "/training/progression",
  "/training/statistik",
  "/training/uebungen",
  "/stats",
  "/koerper",
  "/einstellungen",
];

/** Stylesheet- und Skript-Adressen, auf die eine geladene Seite verweist. */
const ASSET_REF = /(?:href|src)="(\/_next\/static\/[^"]+)"/g;

/**
 * Ohne dieses Nachladen läge zwar die HTML-Hülle einer Seite im Cache, aber
 * nicht ihr Stylesheet und ihr Skript — offline käme dann eine Seite ohne
 * jede Formatierung und ohne die Werte aus dem lokalen Bestand, weil React
 * nie einhängt. Beide Dateien ändern sich mit jedem Build, deshalb lassen sie
 * sich nicht vorab in WARMUP eintragen — nur aus der bereits geladenen Seite
 * selbst herauslesen.
 */
async function cacheReferencedAssets(html, staticCache) {
  const paths = new Set();
  let match;
  while ((match = ASSET_REF.exec(html))) paths.add(match[1]);

  await Promise.all(
    [...paths].map(async (path) => {
      if (await staticCache.match(path)) return;
      try {
        const response = await fetch(path, { credentials: "same-origin" });
        if (isCacheable(response)) await staticCache.put(path, response);
      } catch {
        // Kein Netz — beim nächsten Aufruf mit Netz holt cacheFirst das nach.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pageCache = await caches.open(PAGE_CACHE);
      const staticCache = await caches.open(STATIC_CACHE);
      // Nacheinander, nicht alle auf einmal. Der Browser erlaubt nur eine
      // Handvoll gleichzeitiger Verbindungen zur selben Adresse; alles auf
      // einmal loszuschicken hat die Installation zuverlässig steckenbleiben
      // lassen, sodass die meisten Seiten gar nicht im Cache ankamen. Wie lange
      // die Installation dauert, merkt ohnehin niemand.
      for (const path of WARMUP) {
        try {
          const response = await fetch(path, { credentials: "same-origin" });
          if (isCacheable(response)) {
            const html = await response.clone().text();
            await pageCache.put(path, response);
            await cacheReferencedAssets(html, staticCache);
          }
        } catch {
          // Kein Netz beim Installieren — die Seite landet beim ersten Besuch im Cache
        }
      }
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

  // Der Abgleich erst recht nicht. Eine Antwort aus dem Cache brächte einen
  // alten Cursor und einen alten Bestand — das Gerät würde einen längst
  // überholten Stand übernehmen und im schlimmsten Fall neuere lokale Daten
  // damit überschreiben. Ohne Netz soll dieser Aufruf ehrlich scheitern; die
  // App arbeitet dann einfach mit dem weiter, was lokal liegt.
  if (url.pathname === "/api/sync") return;

  if (isImmutable(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Seiten, RSC-Antworten und Daten-Endpunkte: erst das Netz, dann der Cache.
  // Beim Seitenaufruf springt notfalls die Trainingsübersicht ein, damit statt
  // der Browser-Fehlerseite die App erscheint.
  event.respondWith(networkFirst(request, PAGE_CACHE, request.mode === "navigate"));
});
