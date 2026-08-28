import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { d1Query } from "@/lib/d1";
import { createPasskeyUser } from "@/lib/server-user";
import { AUTH_COOKIE, createSessionCookie, sessionCookieOptions } from "@/lib/auth";
import {
  PASSKEY_COOKIE,
  bytesToBase64,
  expectedOrigin,
  readChallenge,
  rpID,
} from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  const stored = await readChallenge(req.cookies.get(PASSKEY_COOKIE)?.value);
  if (!stored?.signupName) {
    return NextResponse.json({ error: "Der Versuch ist abgelaufen — bitte nochmal." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    response?: RegistrationResponseJSON;
  } | null;
  if (!body?.response) {
    return NextResponse.json({ error: "Unvollständige Antwort." }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: expectedOrigin(req),
      expectedRPID: rpID(req),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Der Passkey konnte nicht bestätigt werden." },
      { status: 400 }
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Der Passkey konnte nicht bestätigt werden." }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // Denselben Passkey ein zweites Mal einzureichen darf kein zweites Konto
  // erzeugen — sonst hinge ein Schlüssel an zwei Kontenständen und welcher
  // beim Anmelden gewinnt, wäre Zufall.
  const [existing] = await d1Query<{ id: string }>(
    `SELECT id FROM passkey_credentials WHERE id = ?`,
    [credential.id]
  );
  if (existing) {
    return NextResponse.json(
      { error: "Dieser Passkey gehört schon zu einem Profil — melde dich damit an." },
      { status: 409 }
    );
  }

  const user = await createPasskeyUser(stored.signupName);

  await d1Query(
    `INSERT INTO passkey_credentials
       (id, user_id, public_key, counter, device_type, backed_up, transports, name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      credential.id,
      user.id,
      bytesToBase64(credential.publicKey),
      credential.counter,
      credentialDeviceType,
      credentialBackedUp ? 1 : 0,
      credential.transports?.join(",") ?? null,
      `Passkey vom ${new Date().toLocaleDateString("de-DE")}`,
    ]
  );

  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(
    AUTH_COOKIE,
    await createSessionCookie({
      uid: user.id,
      email: user.email,
      name: user.name ?? undefined,
    }),
    sessionCookieOptions
  );
  res.cookies.delete(PASSKEY_COOKIE);
  return res;
}
