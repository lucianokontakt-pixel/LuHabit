import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  OAUTH_COOKIE,
  createSessionCookie,
  sessionCookieOptions,
  verifyValue,
} from "@/lib/auth";
import { decodeIdToken, emailAllowed, googleRedirectUri, idTokenValid } from "@/lib/oauth";
import { upsertGoogleUser } from "@/lib/server-user";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Bei einem stillen Anmeldeversuch (prompt=none, siehe start/route.ts) ist ein
 * Fehlschlag der Normalfall, sobald keine Google-Sitzung mehr besteht — kein
 * Grund für eine Fehlermeldung. Die normale Anmeldeseite erscheint dann ohne
 * jeden Hinweis, dass im Hintergrund schon ein Versuch lief.
 */
async function loginError(req: NextRequest, code: string, detail?: string) {
  const stored = await verifyValue(req.cookies.get(OAUTH_COOKIE)?.value ?? "");
  let silent = false;
  let from = "/";
  if (stored) {
    try {
      const parsed = JSON.parse(atob(stored)) as { from?: string; silent?: boolean };
      silent = Boolean(parsed.silent);
      if (parsed.from?.startsWith("/") && !parsed.from.startsWith("//")) from = parsed.from;
    } catch {
      // Ohne lesbaren Inhalt bleibt es beim normalen, sichtbaren Fehlerpfad.
    }
  }

  const url = new URL("/login", req.url);
  if (silent) {
    url.searchParams.set("from", from);
    url.searchParams.set("silentDone", "1");
  } else {
    url.searchParams.set("error", code);
    // Googles eigener Fehlercode (z.B. invalid_client, redirect_uri_mismatch)
    // hilft beim Einrichten enorm und enthält keine Geheimnisse.
    if (detail) url.searchParams.set("detail", detail);
  }
  const res = NextResponse.redirect(url);
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginError(req, "nicht_konfiguriert");

  // Von Google zurückgemeldeter Abbruch (z.B. "Zugriff verweigert").
  if (req.nextUrl.searchParams.get("error")) return loginError(req, "abgebrochen");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) return loginError(req, "unvollstaendig");

  const stored = await verifyValue(req.cookies.get(OAUTH_COOKIE)?.value ?? "");
  if (!stored) return loginError(req, "abgelaufen");

  let parsed: { state: string; verifier: string; from: string };
  try {
    parsed = JSON.parse(atob(stored));
  } catch {
    return loginError(req, "abgelaufen");
  }

  // Schutz gegen untergeschobene Anmeldungen (CSRF).
  if (parsed.state !== state) return loginError(req, "state_falsch");

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(req),
      grant_type: "authorization_code",
      code_verifier: parsed.verifier,
    }),
  });

  if (!tokenRes.ok) {
    const body = (await tokenRes.json().catch(() => null)) as
      | { error?: string; error_description?: string }
      | null;
    console.error("Google token exchange failed", tokenRes.status, body);
    return loginError(req, "token_fehlgeschlagen", body?.error ?? String(tokenRes.status));
  }

  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) return loginError(req, "kein_id_token");

  const claims = decodeIdToken(tokens.id_token);
  if (!claims || !idTokenValid(claims, clientId)) return loginError(req, "token_ungueltig");
  if (!claims.email || claims.email_verified === false) return loginError(req, "keine_mail");
  if (!emailAllowed(claims.email)) return loginError(req, "nicht_freigegeben");

  const user = await upsertGoogleUser({
    email: claims.email,
    name: claims.name,
    picture: claims.picture,
  });

  // Nur relative Ziele zulassen, damit der from-Parameter keine offene
  // Weiterleitung auf fremde Seiten wird.
  const target = parsed.from?.startsWith("/") && !parsed.from.startsWith("//") ? parsed.from : "/";

  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.set(
    AUTH_COOKIE,
    await createSessionCookie({
      uid: user.id,
      email: user.email,
      name: user.name ?? undefined,
      picture: user.picture ?? undefined,
    }),
    sessionCookieOptions
  );
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}
