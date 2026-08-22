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
    // Kein prompt-Parameter: ist am Gerät nur ein Google-Konto angemeldet,
    // bestätigt Google das ohne Zwischenschritt. "select_account" hätte bei
    // jeder erneuten Anmeldung erzwungen, das Konto extra anzutippen — bei
    // iOS' 7-Tage-Speicherbereinigung, die die Sitzung öfter zurücksetzt als
    // die 90 Tage des Cookies vorsehen, war das ein unnötiger Extra-Tap bei
    // jedem Mal.
  });

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);

  // state und Verifier signiert im Cookie ablegen, kurz gültig.
  res.cookies.set(
    OAUTH_COOKIE,
    await signValue(btoa(JSON.stringify({ state, verifier, from }))),
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
