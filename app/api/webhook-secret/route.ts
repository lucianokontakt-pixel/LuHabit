import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { randomToken } from "@/lib/auth";
import { currentUserId } from "@/lib/server-user";

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await d1Query<{ webhook_secret: string | null }>(
    `SELECT webhook_secret FROM users WHERE id = ?`,
    [userId]
  );

  return NextResponse.json({ secret: rows[0]?.webhook_secret ?? null });
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = randomToken(24);
  await d1Query(`UPDATE users SET webhook_secret = ? WHERE id = ?`, [secret, userId]);

  return NextResponse.json({ secret });
}
