import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { PASSKEY_COOKIE, challengeCookieOptions, rpID, signChallenge } from "@/lib/webauthn";

/**
 * Ohne `allowCredentials`: der Browser zeigt dem Nutzer jeden Passkey, den er
 * für diese Adresse gespeichert hat, statt vorher nach einer Mailadresse zu
 * fragen — genau der Punkt am Passkey-Login. Welches Konto es ist, entscheidet
 * erst login-verify anhand der zurückgegebenen Credential-ID.
 */
export async function GET(req: NextRequest) {
  const options = await generateAuthenticationOptions({
    rpID: rpID(req),
    userVerification: "preferred",
  });

  const res = NextResponse.json(options);
  res.cookies.set(
    PASSKEY_COOKIE,
    await signChallenge({ challenge: options.challenge }),
    challengeCookieOptions
  );
  return res;
}
