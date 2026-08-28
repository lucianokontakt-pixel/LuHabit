import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authConfigured, isPublicPath, readSessionCookie } from "@/lib/auth";

/**
 * NICHT in proxy.ts umbenennen, auch wenn der Build es bei jedem Lauf anmahnt.
 *
 * Next 16 hat middleware.ts zu proxy.ts umbenannt — und dabei die Laufzeit
 * gewechselt: proxy läuft auf Node, und die Laufzeit lässt sich dort nicht
 * einstellen (`runtime` in einer Proxy-Datei wirft einen Fehler, siehe
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * @opennextjs/cloudflare bricht den Build genau dafür ab: "Node.js middleware
 * is not currently supported" (dist/cli/build/build.js). Die alte Datei bleibt
 * auf der Edge-Laufzeit und ist damit die einzige, die deployt.
 *
 * Nachweisbar am Build: mit proxy.ts steht "/_middleware" in
 * .next/server/functions-config-manifest.json und middleware-manifest.json ist
 * leer — mit middleware.ts genau andersherum. Am 2026-08-27 umbenannt, sechs
 * Deploys sind daran gescheitert, am 2026-08-28 zurückgenommen. Erst wieder
 * anfassen, wenn der Cloudflare-Adapter Node-Middleware kann.
 */
export async function middleware(req: NextRequest) {
  // Ohne eingerichteten Login bleibt die App offen — so wie in der lokalen
  // Entwicklung ohne Konfiguration.
  if (!authConfigured()) {
    return NextResponse.next();
  }

  // Die Login-Seite, der OAuth-Fluss und die Webhooks brauchen keine Sitzung.
  // Die Liste steht in lib/auth.ts, weil sie dort testbar ist — im Matcher
  // unten wäre sie es nicht, siehe Kommentar bei isPublicPath.
  if (isPublicPath(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const session = await readSessionCookie(req.cookies.get(AUTH_COOKIE)?.value);
  if (session) {
    return NextResponse.next();
  }

  // API-Anfragen bekommen 401 statt einer Weiterleitung auf HTML — sonst
  // versucht der Client, eine Login-Seite als JSON zu lesen.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Nur noch die statischen Dateien. Wer angemeldet sein muss, entscheidet
    // isPublicPath — Icons bleiben ohne Anmeldung erreichbar, die Login-Seite
    // selbst braucht sie, und ein Redirect auf HTML ergibt für ein Bild
    // keinen Sinn.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|sw.js).*)",
  ],
};
