import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, OAUTH_COOKIE } from "@/lib/auth";

function clear(req: NextRequest) {
  const url = new URL("/login", req.url);
  // Ohne diese Markierung würde die Anmeldeseite sofort wieder still bei
  // Google nachfragen (siehe login-form.tsx) — und meldet sich jemand
  // ausdrücklich ab, soll genau das nicht im Hintergrund rückgängig gemacht
  // werden, solange die Google-Sitzung selbst noch besteht.
  url.searchParams.set("silentDone", "1");
  const res = NextResponse.redirect(url);
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
