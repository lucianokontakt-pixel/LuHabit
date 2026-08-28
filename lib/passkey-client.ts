"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export type PasskeyResult = { ok: true } | { ok: false; error: string };

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * Fügt dem angemeldeten Konto einen neuen Passkey hinzu. Muss aus einer echten
 * Nutzergeste heraus laufen (Knopfdruck) — der Browser verweigert
 * `navigator.credentials.create` sonst stillschweigend.
 */
export async function registerPasskey(name?: string): Promise<PasskeyResult & { name?: string }> {
  const optionsRes = await fetch("/api/auth/passkey/register-options");
  if (!optionsRes.ok) {
    return { ok: false, error: await readError(optionsRes, "Konnte die Registrierung nicht starten.") };
  }
  const options = await optionsRes.json();

  let attestation;
  try {
    attestation = await startRegistration({ optionsJSON: options });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Abgebrochen." };
  }

  const verifyRes = await fetch("/api/auth/passkey/register-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: attestation, name }),
  });
  if (!verifyRes.ok) {
    return { ok: false, error: await readError(verifyRes, "Der Passkey konnte nicht gespeichert werden.") };
  }
  const body = (await verifyRes.json()) as { name: string };
  return { ok: true, name: body.name };
}

/**
 * Meldet ohne bekannte Kontokennung an: der Browser zeigt selbst, welche
 * Passkeys für diese Adresse gespeichert sind. Setzt bei Erfolg die
 * Sitzung — ein Neuladen der Seite danach reicht.
 */
export async function loginWithPasskey(): Promise<PasskeyResult> {
  const optionsRes = await fetch("/api/auth/passkey/login-options");
  if (!optionsRes.ok) {
    return { ok: false, error: await readError(optionsRes, "Konnte die Anmeldung nicht starten.") };
  }
  const options = await optionsRes.json();

  let assertion;
  try {
    assertion = await startAuthentication({ optionsJSON: options });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Abgebrochen." };
  }

  const verifyRes = await fetch("/api/auth/passkey/login-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: assertion }),
  });
  if (!verifyRes.ok) {
    return { ok: false, error: await readError(verifyRes, "Die Anmeldung ist fehlgeschlagen.") };
  }
  return { ok: true };
}
