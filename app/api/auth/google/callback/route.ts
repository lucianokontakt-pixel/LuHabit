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

function loginError(req: NextRequest, code: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", code);
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

  if (!tokenRes.ok) return loginError(req, "token_fehlgeschlagen");

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
