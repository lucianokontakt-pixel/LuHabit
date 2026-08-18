import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, hashPasscode } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const passcode = process.env.APP_PASSCODE;

  // Kein Passcode gesetzt -> App bleibt offen (z.B. für lokale Entwicklung).
  if (!passcode) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = await hashPasscode(passcode);

  if (cookie === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/steps/webhook|_next/static|_next/image|favicon.ico).*)",
  ],
};
