import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { currentUserId } from "@/lib/server-user";

/** Für die Liste in den Einstellungen — nie der öffentliche Schlüssel selbst. */
export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const rows = await d1Query<{
    id: string;
    name: string;
    created_at: string;
    last_used_at: string | null;
  }>(
    `SELECT id, name, created_at, last_used_at FROM passkey_credentials
      WHERE user_id = ? ORDER BY created_at ASC`,
    [userId]
  );

  return NextResponse.json({ passkeys: rows });
}
