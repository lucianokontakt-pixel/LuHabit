import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  OWNER_USER_ID,
  createSessionCookie,
  sessionCookieOptions,
} from "@/lib/auth";
import { findUserById } from "@/lib/server-user";

/**
 * Notfall-Zugang per Passcode. Meldet immer als Owner an — der Passcode ist
 * kein Konto, sondern der Ersatzschlüssel für den Fall, dass Google klemmt.
 */
export async function POST(req: NextRequest) {
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  const expected = process.env.APP_PASSCODE;

  if (!expected) {
    return NextResponse.json({ error: "Passcode-Zugang ist nicht eingerichtet" }, { status: 400 });
  }

  if (passcode !== expected) {
    return NextResponse.json({ error: "Falscher Passcode" }, { status: 401 });
  }

  const owner = await findUserById(OWNER_USER_ID);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    AUTH_COOKIE,
    await createSessionCookie({
      uid: OWNER_USER_ID,
      email: owner?.email ?? "owner@luhabit.local",
      name: owner?.name ?? "Owner",
    }),
    sessionCookieOptions
  );
  return res;
}
