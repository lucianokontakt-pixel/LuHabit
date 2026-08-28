import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { d1Query } from "@/lib/d1";
import { AUTH_COOKIE, createSessionCookie, sessionCookieOptions,
  PASSKEY_HINT_COOKIE,
  passkeyHintCookieOptions,
} from "@/lib/auth";
import {
  PASSKEY_COOKIE,
  base64ToBytes,
  expectedOrigin,
  readChallenge,
  rpID,
  type PasskeyCredentialRow,
} from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  const stored = await readChallenge(req.cookies.get(PASSKEY_COOKIE)?.value);
  if (!stored) {
    return NextResponse.json({ error: "Der Anmeldeversuch ist abgelaufen." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    response?: AuthenticationResponseJSON;
  } | null;
  if (!body?.response) {
    return NextResponse.json({ error: "Unvollständige Antwort." }, { status: 400 });
  }

  const [row] = await d1Query<PasskeyCredentialRow>(
    `SELECT * FROM passkey_credentials WHERE id = ?`,
    [body.response.id]
  );
  if (!row) {
    return NextResponse.json({ error: "Dieser Passkey ist hier nicht registriert." }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: expectedOrigin(req),
      expectedRPID: rpID(req),
      credential: {
        id: row.id,
        publicKey: base64ToBytes(row.public_key),
        counter: row.counter,
        transports: row.transports
          ? (row.transports.split(",") as AuthenticatorTransportFuture[])
          : undefined,
      },
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

  const [user] = await d1Query<{ id: string; email: string; name: string | null; picture: string | null }>(
    `SELECT id, email, name, picture FROM users WHERE id = ?`,
    [row.user_id]
  );
  if (!user) {
    return NextResponse.json({ error: "Zu diesem Passkey gehört kein Konto mehr." }, { status: 400 });
  }

  await d1Query(
    `UPDATE passkey_credentials SET counter = ?, last_used_at = datetime('now') WHERE id = ?`,
    [verification.authenticationInfo.newCounter, row.id]
  );

  const res = NextResponse.json({ ok: true });
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
  // Ab jetzt weiß dieses Gerät, dass es hier einen Passkey gibt — auch wenn
  // iOS das Ablagefach der installierten App später leerräumt. Der Merker
  // überlebt das als Cookie und lässt die Login-Seite den Passkey von sich aus
  // anbieten, statt erst einen Knopfdruck abzuwarten.
  res.cookies.set(PASSKEY_HINT_COOKIE, "1", passkeyHintCookieOptions);
  res.cookies.delete(PASSKEY_COOKIE);
  return res;
}
