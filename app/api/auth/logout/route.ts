import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, OAUTH_COOKIE } from "@/lib/auth";

function clear(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(AUTH_COOKIE);
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}

// Nur POST: components/user-menu.tsx schickt ein Formular ab. Ein zusätzlicher
// GET-Handler liesse sich von einer fremden Seite per <img src="…"> auslösen
// und würde die Sitzung ungefragt beenden.
export async function POST(req: NextRequest) {
  return clear(req);
}
