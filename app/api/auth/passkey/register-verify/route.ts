import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { d1Query } from "@/lib/d1";
import { currentUserId } from "@/lib/server-user";
import { PASSKEY_HINT_COOKIE, passkeyHintCookieOptions } from "@/lib/auth";
import {
  PASSKEY_COOKIE,
  bytesToBase64,
  expectedOrigin,
  readChallenge,
  rpID,
} from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const stored = await readChallenge(req.cookies.get(PASSKEY_COOKIE)?.value);
  if (!stored || stored.userId !== userId) {
    return NextResponse.json({ error: "Der Registrierungsversuch ist abgelaufen." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    response?: RegistrationResponseJSON;
    name?: string;
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

  // Ohne eigenen Namen ein Datum statt einer Nummer — wer mehrere Geräte
  // anmeldet, erkennt "Passkey vom 28.8.2026" später leichter wieder als
  // "Passkey 2".
  const label =
    (body.name ?? "").trim().slice(0, 60) || `Passkey vom ${new Date().toLocaleDateString("de-DE")}`;

  await d1Query(
    `INSERT INTO passkey_credentials
       (id, user_id, public_key, counter, device_type, backed_up, transports, name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      credential.id,
      userId,
      bytesToBase64(credential.publicKey),
      credential.counter,
      credentialDeviceType,
      credentialBackedUp ? 1 : 0,
      credential.transports?.join(",") ?? null,
      label,
    ]
  );

  const res = NextResponse.json({ ok: true, name: label });
  // Ab jetzt weiß dieses Gerät, dass es hier einen Passkey gibt — auch wenn
  // iOS das Ablagefach der installierten App später leerräumt. Der Merker
  // überlebt das als Cookie und lässt die Login-Seite den Passkey von sich aus
  // anbieten, statt erst einen Knopfdruck abzuwarten.
  res.cookies.set(PASSKEY_HINT_COOKIE, "1", passkeyHintCookieOptions);
  res.cookies.delete(PASSKEY_COOKIE);
  return res;
}
