/**
 * Sitzungen als signiertes Cookie statt als Datenbank-Eintrag.
 *
 * Der Proxy läuft bei jedem einzelnen Request. Ein DB-Aufruf pro Request
 * wäre über die D1-HTTP-API spürbar teuer, deshalb trägt das Cookie die
 * Nutzerkennung selbst und ist mit HMAC-SHA256 signiert. Nachteil, den man
 * kennen sollte: eine Sitzung lässt sich nicht serverseitig widerrufen, sie
 * läuft nur ab. Für diese App ist das der richtige Tausch.
 *
 * Diese Datei wird auch aus dem Proxy importiert und darf deshalb nur
 * Web-APIs benutzen — kein Node, kein Datenbankzugriff.
 */

export const AUTH_COOKIE = "luhabit_session";
export const OAUTH_COOKIE = "luhabit_oauth";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 Tage

/** Feste Kennung des Kontos, dem der Datenbestand vor dem Mehrbenutzer-Umbau gehört. */
export const OWNER_USER_ID = "usr_owner";

export type SessionUser = {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
};

type SessionPayload = SessionUser & { exp: number };

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  // Bewusst nicht Uint8Array.from: das liefert ArrayBufferLike, crypto.subtle
  // erwartet aber einen echten ArrayBuffer.
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function secretOrThrow(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET fehlt oder ist zu kurz (mindestens 16 Zeichen). Ohne das Secret lassen sich Sitzungen nicht signieren."
    );
  }
  return secret;
}

/** Ist überhaupt ein Login eingerichtet? Ohne Konfiguration bleibt die App offen. */
export function authConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

/**
 * Pfade, die ohne Sitzung erreichbar sein müssen. Webhooks prüfen ihr eigenes
 * Secret in der Route (userIdForWebhookSecret) — der Proxy darf sie nicht
 * vorher abfangen.
 *
 * Bewusst eine Funktion und keine Ausnahme im Matcher: Next.js verlangt den
 * Matcher statisch im Quelltext, eine importierte Konstante ist dort nicht
 * erlaubt. Als Regex wäre diese Liste also nicht testbar — und genau das hat
 * gekostet: /api/entries/webhook fehlte darin und war deshalb tot.
 */
export function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  // Jeder Endpunkt auf /webhook bringt seine eigene Prüfung mit. Über das
  // Namensmuster ist ein neuer Webhook automatisch ausgenommen.
  if (pathname.startsWith("/api/") && pathname.endsWith("/webhook")) return true;
  return false;
}

export async function signValue(value: string): Promise<string> {
  const key = await signingKey(secretOrThrow());
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return `${value}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyValue(signed: string): Promise<string | null> {
  const index = signed.lastIndexOf(".");
  if (index === -1) return null;

  const value = signed.slice(0, index);
  const signature = signed.slice(index + 1);

  try {
    const key = await signingKey(secretOrThrow());
    // crypto.subtle.verify vergleicht in konstanter Zeit.
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      encoder.encode(value)
    );
    return ok ? value : null;
  } catch {
    return null;
  }
}

export async function createSessionCookie(user: SessionUser): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  return signValue(base64UrlEncode(encoder.encode(JSON.stringify(payload))));
}

export async function readSessionCookie(value: string | undefined): Promise<SessionUser | null> {
  if (!value) return null;

  const verified = await verifyValue(value);
  if (!verified) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(verified))
    ) as SessionPayload;

    if (!payload.uid || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      uid: payload.uid,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

/** Zufälliger URL-sicherer Wert für state und PKCE-Verifier. */
export function randomToken(bytes = 32): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}
