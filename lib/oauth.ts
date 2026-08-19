import type { NextRequest } from "next/server";

/**
 * Die Redirect-URI muss exakt der bei Google hinterlegten entsprechen.
 * In Produktion steht sie in APP_URL, lokal ergibt sie sich aus der Anfrage —
 * so funktionieren localhost und die Live-Adresse mit derselben Konfiguration,
 * solange beide bei Google eingetragen sind.
 */
export function appOrigin(req: NextRequest): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return req.nextUrl.origin;
}

export function googleRedirectUri(req: NextRequest): string {
  return `${appOrigin(req)}/api/auth/google/callback`;
}

/**
 * Prüft, ob sich diese Adresse anmelden darf. Ohne ALLOWED_EMAILS ist die
 * Registrierung offen; mit gesetzter Liste kommen nur diese Adressen rein.
 */
export function emailAllowed(email: string): boolean {
  const raw = process.env.ALLOWED_EMAILS?.trim();
  if (!raw) return true;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

export type GoogleIdTokenClaims = {
  iss: string;
  aud: string;
  exp: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

/**
 * Liest die Claims aus dem id_token.
 *
 * Die Signatur wird bewusst nicht gegen Googles JWKS geprüft: das Token kommt
 * aus der direkten Server-zu-Server-Antwort des Token-Endpunkts über TLS, nicht
 * über den Browser. Google dokumentiert diesen Fall ausdrücklich als den, in
 * dem die Signaturprüfung entfallen darf. Aussteller, Empfänger und Ablauf
 * werden trotzdem geprüft.
 */
export function decodeIdToken(idToken: string): GoogleIdTokenClaims | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;

  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    // atob liefert Bytes als Latin-1 — für Umlaute in Namen zurück nach UTF-8.
    const bytes = new Uint8Array(json.length);
    for (let i = 0; i < json.length; i++) bytes[i] = json.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes)) as GoogleIdTokenClaims;
  } catch {
    return null;
  }
}

export function idTokenValid(claims: GoogleIdTokenClaims, clientId: string): boolean {
  const issuerOk =
    claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com";
  const audienceOk = claims.aud === clientId;
  const notExpired = claims.exp > Math.floor(Date.now() / 1000);
  return issuerOk && audienceOk && notExpired;
}
