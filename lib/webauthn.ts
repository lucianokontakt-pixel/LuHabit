import type { NextRequest } from "next/server";
import { appOrigin } from "@/lib/oauth";
import { signValue, verifyValue } from "@/lib/auth";

/**
 * Passkeys sind an eine Domain gebunden (die "Relying Party"). Dieselbe
 * Funktion, die schon die Google-Redirect-URI bestimmt, liefert sie: in
 * Produktion die feste APP_URL, lokal die Adresse der Anfrage — so passt ein
 * auf dem Handy registrierter Passkey zur Live-Adresse, und ein lokal
 * registrierter zu localhost, ohne dass beides sich in die Quere kommt.
 */
export const RP_NAME = "LuHabit";

export function rpID(req: NextRequest): string {
  return new URL(appOrigin(req)).hostname;
}

export function expectedOrigin(req: NextRequest): string {
  return appOrigin(req);
}

export const PASSKEY_COOKIE = "luhabit_passkey_challenge";

/**
 * Die Herausforderung einer laufenden Passkey-Zeremonie — kurz gültig, im
 * selben signierten Cookie-Muster wie schon der Google-Anmeldeversuch
 * (OAUTH_COOKIE in lib/auth.ts). Bei der Registrierung steckt zusätzlich die
 * Kontokennung mit drin, damit register-verify sie nicht noch einmal aus der
 * Sitzung lesen muss — die kann sich zwischen den beiden Anfragen theoretisch
 * geändert haben.
 */
export type PasskeyChallenge = {
  challenge: string;
  /** Gesetzt beim Hinzufügen zu einem bestehenden, angemeldeten Konto. */
  userId?: string;
  /**
   * Gesetzt beim Anlegen eines neuen Profils von der Login-Seite aus. Der Name
   * reist mit im signierten Cookie statt im Request-Body der zweiten Anfrage,
   * damit zwischen "Name eingeben" und "Face ID bestätigt" niemand einen
   * anderen unterschieben kann.
   */
  signupName?: string;
};

export async function signChallenge(payload: PasskeyChallenge): Promise<string> {
  return signValue(btoa(JSON.stringify(payload)));
}

export async function readChallenge(signed: string | undefined): Promise<PasskeyChallenge | null> {
  if (!signed) return null;
  const verified = await verifyValue(signed);
  if (!verified) return null;
  try {
    return JSON.parse(atob(verified)) as PasskeyChallenge;
  } catch {
    return null;
  }
}

export const challengeCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 5,
};

/** Rohe Bytes eines öffentlichen Schlüssels als Text für die Datenbankspalte. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type PasskeyCredentialRow = {
  id: string;
  user_id: string;
  public_key: string;
  counter: number;
  device_type: string;
  backed_up: number;
  transports: string | null;
  name: string;
  created_at: string;
  last_used_at: string | null;
};
