import { NextRequest, NextResponse } from "next/server";
import { OAUTH_COOKIE, pkceChallenge, randomToken, signValue } from "@/lib/auth";
import { googleRedirectUri } from "@/lib/oauth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=nicht_konfiguriert", req.url));
  }

  const state = randomToken();
  const verifier = randomToken(48);
  const from = req.nextUrl.searchParams.get("from") || "/";
  // Die eigene 90-Tage-Sitzung übersteht iOS' Speicherbereinigung nicht — bei
  // einer als Home-Bildschirm-App installierten PWA räumt iOS das isolierte
  // Ablagefach schon nach rund einer Woche ohne Nutzung leer, das Cookie
  // eingeschlossen. Ein "stiller" Versuch (prompt=none) fragt Google im
  // Hintergrund, ob am Gerät noch eine Google-Sitzung besteht, und meldet ohne
  // sichtbaren Zwischenschritt neu an, solange die besteht — nur wenn auch die
  // längst nicht mehr da ist, landet man auf der normalen Anmeldeseite.
  const silent = req.nextUrl.searchParams.get("silent") === "1";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    // Kein Refresh Token nötig — die App spricht nach dem Login nicht mehr
    // mit Google, sie braucht nur die Identität.
    access_type: "online",
    ...(silent ? { prompt: "none" } : {}),
  });

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);

  // state und Verifier signiert im Cookie ablegen, kurz gültig.
  res.cookies.set(
    OAUTH_COOKIE,
    await signValue(btoa(JSON.stringify({ state, verifier, from, silent }))),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    }
  );

  return res;
}
