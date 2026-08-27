import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authConfigured, isPublicPath, readSessionCookie } from "@/lib/auth";

export async function proxy(req: NextRequest) {
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
