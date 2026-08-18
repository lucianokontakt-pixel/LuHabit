import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, hashPasscode } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  const expected = process.env.APP_PASSCODE;

  if (!expected) {
    return NextResponse.json({ ok: true });
  }

  if (passcode !== expected) {
    return NextResponse.json({ error: "Falscher Passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await hashPasscode(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
