import { NextRequest, NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { d1Query } from "@/lib/d1";
import { currentUserId } from "@/lib/server-user";
import {
  PASSKEY_COOKIE,
  RP_NAME,
  challengeCookieOptions,
  rpID,
  signChallenge,
  type PasskeyCredentialRow,
} from "@/lib/webauthn";

/**
 * Ein Passkey wird an ein bestehendes, angemeldetes Konto gehängt — kein
 * eigener Registrierungsweg. Wer noch keine Sitzung hat, meldet sich zuerst
 * über Google an und fügt den Passkey danach in den Einstellungen hinzu.
 */
export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const [user] = await d1Query<{ email: string; name: string | null }>(
    `SELECT email, name FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) return NextResponse.json({ error: "Konto nicht gefunden" }, { status: 404 });

  const existing = await d1Query<Pick<PasskeyCredentialRow, "id" | "transports">>(
    `SELECT id, transports FROM passkey_credentials WHERE user_id = ?`,
    [userId]
  );

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(req),
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: c.transports
        ? (c.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    })),
    // "required" statt "preferred": ohne einen residenten Schlüssel gäbe es
    // beim Login nichts, das der Browser ohne vorher bekannte Kontokennung
    // anbieten könnte — genau das soll die Anmeldung ja gerade sparen.
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });

  const res = NextResponse.json(options);
  res.cookies.set(
    PASSKEY_COOKIE,
    await signChallenge({ challenge: options.challenge, userId }),
    challengeCookieOptions
  );
  return res;
}
