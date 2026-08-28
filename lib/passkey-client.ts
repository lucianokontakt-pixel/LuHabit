"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export type PasskeyResult = { ok: true } | { ok: false; error: string };

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

const REGISTERED_KEY = "luhabit-passkey-registered";

/**
 * Ob dieser Browser hier schon einmal einen Passkey angelegt hat. WebAuthn
 * selbst verrät das vorher nicht — ein `navigator.credentials.get()` ohne
 * Treffer endet in Safaris eigenem "Du hast keinen Passkey für diese Website"-
 * Fenster, nicht in einer stillen Absage. Ohne dieses Gedächtnis würde die
 * Login-Seite jeden zum ersten Mal Kommenden geradewegs in dieses Fenster
 * schicken, weil der Passkey-Knopf vorschnell zum Hauptweg würde.
 *
 * Bewusst pro Browser, nicht pro Konto: ein Passkey aus iCloud-Schlüsselbund
 * kann auf einem zweiten Gerät längst da sein, auch wenn dieser Browser hier
 * noch nichts davon weiß — dann bleibt der Passkey-Knopf dort kleiner, statt
 * zu behaupten, es gäbe nichts.
 */
export function hasRegisteredPasskeyHere(): boolean {
  try {
    return localStorage.getItem(REGISTERED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberPasskeyRegistered() {
  try {
    localStorage.setItem(REGISTERED_KEY, "1");
  } catch {
    // Kein Speicher, kein Drama — der Knopf bleibt dann einfach klein.
  }
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
  rememberPasskeyRegistered();
  return { ok: true, name: body.name };
}

/**
 * Legt ein neues Profil direkt von der Login-Seite aus an — ohne vorherige
 * Anmeldung, ohne Mailadresse. Name, Face ID, drin.
 */
export async function signupWithPasskey(
  name: string
): Promise<PasskeyResult & { name?: string }> {
  const optionsRes = await fetch("/api/auth/passkey/signup-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!optionsRes.ok) {
    return { ok: false, error: await readError(optionsRes, "Konnte das Profil nicht anlegen.") };
  }
  const options = await optionsRes.json();

  let attestation;
  try {
    attestation = await startRegistration({ optionsJSON: options });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Abgebrochen." };
  }

  const verifyRes = await fetch("/api/auth/passkey/signup-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: attestation }),
  });
  if (!verifyRes.ok) {
    return { ok: false, error: await readError(verifyRes, "Das Profil konnte nicht angelegt werden.") };
  }
  const body = (await verifyRes.json()) as { name: string };
  rememberPasskeyRegistered();
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
  // Hat gerade geklappt, also weiß dieser Browser jetzt sicher, dass es hier
  // einen Passkey gibt — auch wenn er (etwa aus dem iCloud-Schlüsselbund
  // eines anderen Geräts) nie über registerPasskey() hier entstanden ist.
  rememberPasskeyRegistered();
  return { ok: true };
}
