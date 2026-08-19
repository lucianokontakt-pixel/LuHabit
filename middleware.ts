import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authConfigured, readSessionCookie } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  // Ohne eingerichteten Login bleibt die App offen — so wie in der lokalen
  // Entwicklung ohne Konfiguration.
  if (!authConfigured()) {
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
    "/((?!login|api/auth|api/steps/webhook|_next/static|_next/image|favicon.ico).*)",
  ],
};
