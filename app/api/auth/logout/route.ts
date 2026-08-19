import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, OAUTH_COOKIE } from "@/lib/auth";

function clear(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(AUTH_COOKIE);
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}

export async function POST(req: NextRequest) {
  return clear(req);
}

export async function GET(req: NextRequest) {
  return clear(req);
}
