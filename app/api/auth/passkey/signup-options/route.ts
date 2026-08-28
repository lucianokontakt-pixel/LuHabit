import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import {
  PASSKEY_COOKIE,
  RP_NAME,
  challengeCookieOptions,
  rpID,
  signChallenge,
} from "@/lib/webauthn";

/**
 * Ein neues Profil direkt beim Anmelden anlegen — ohne vorher irgendwo
 * eingeloggt zu sein. Name eintippen, Face ID, fertig.
 *
 * Die Kontokennung entsteht schon hier und wandert signiert im Cookie mit,
 * damit signup-verify sie nicht vom Client entgegennehmen muss: sonst könnte
 * jemand eine fremde ID mitschicken und den Passkey an ein bestehendes Konto
 * hängen.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const name = (body?.name ?? "").trim().slice(0, 40);
  if (!name) {
    return NextResponse.json({ error: "Bitte einen Namen eintragen." }, { status: 400 });
  }

  // Die WebAuthn-Nutzerkennung ist nicht die spätere Konto-ID: die vergibt
  // erst createPasskeyUser beim Verifizieren. Hier zählt nur, dass sie für
  // diesen einen Vorgang eindeutig ist.
  const handle = crypto.getRandomValues(new Uint8Array(16));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(req),
    userID: handle,
    userName: name,
    userDisplayName: name,
    attestationType: "none",
    // Wie beim Hinzufügen aus den Einstellungen: ohne residenten Schlüssel
    // hätte der Browser beim späteren Anmelden nichts anzubieten.
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });

  const res = NextResponse.json(options);
  res.cookies.set(
    PASSKEY_COOKIE,
    await signChallenge({ challenge: options.challenge, signupName: name }),
    challengeCookieOptions
  );
  return res;
}
