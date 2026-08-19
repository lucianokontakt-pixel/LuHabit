import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authConfigured, readSessionCookie } from "@/lib/auth";

/** Wer ist gerade angemeldet — für die Anzeige in der Navigation. */
export async function GET(req: NextRequest) {
  if (!authConfigured()) {
    return NextResponse.json({ user: null, authEnabled: false });
  }

  const session = await readSessionCookie(req.cookies.get(AUTH_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ user: null, authEnabled: true }, { status: 401 });
  }

  return NextResponse.json({
    user: { email: session.email, name: session.name ?? null, picture: session.picture ?? null },
    authEnabled: true,
  });
}
