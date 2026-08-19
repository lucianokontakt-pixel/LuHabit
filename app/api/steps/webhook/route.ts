import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { todayISO } from "@/lib/habits";
import { OWNER_USER_ID } from "@/lib/auth";
import { userIdForWebhookSecret } from "@/lib/server-user";

// Für den iOS Shortcut gedacht: liest die Schritte aus der Health-App
// und schickt sie hierher. Aufruf z.B.:
// POST /api/steps/webhook?secret=DEIN_SECRET  Body: { "steps": 4213 }
//
// Auth in zwei Stufen: zuerst gegen das persönliche Secret aus
// /einstellungen (users.webhook_secret, wie beim generischen Entries-
// Webhook) — damit kann jedes Konto seinen eigenen Shortcut einrichten.
// Kennt niemand dieses Secret, greift als Rückfallebene das alte,
// serverweite STEPS_WEBHOOK_SECRET fest auf den Owner, damit bereits
// eingerichtete Shortcuts weiterlaufen.
export async function POST(req: NextRequest) {
  const providedSecret =
    req.nextUrl.searchParams.get("secret") || req.headers.get("x-webhook-secret");

  const legacySecret = process.env.STEPS_WEBHOOK_SECRET;
  const userId =
    (await userIdForWebhookSecret(providedSecret)) ??
    (legacySecret && providedSecret === legacySecret ? OWNER_USER_ID : null);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const steps = Number(body.steps);
  const date = typeof body.date === "string" ? body.date : todayISO();

  if (!Number.isFinite(steps) || steps < 0) {
    return NextResponse.json({ error: "steps (Zahl >= 0) erforderlich" }, { status: 400 });
  }

  await d1Query(
    `INSERT INTO entries (user_id, habit, date, value) VALUES (?, 'steps', ?, ?)
     ON CONFLICT(user_id, habit, date) DO UPDATE SET value = excluded.value`,
    [userId, date, steps]
  );

  return NextResponse.json({ ok: true, date, steps });
}
