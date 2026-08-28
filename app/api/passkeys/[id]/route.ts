import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { currentUserId } from "@/lib/server-user";

/**
 * Löscht immer nur den eigenen Passkey — der Besitzer steckt im WHERE, nicht
 * in einer separaten Prüfung davor, sonst könnte eine fremde ID hier
 * unbemerkt durchrutschen.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  await d1Query(`DELETE FROM passkey_credentials WHERE id = ? AND user_id = ?`, [id, userId]);

  return NextResponse.json({ ok: true });
}
