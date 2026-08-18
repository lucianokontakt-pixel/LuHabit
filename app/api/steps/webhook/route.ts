import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { todayISO } from "@/lib/habits";

// Für den iOS Shortcut gedacht: liest die Schritte aus der Health-App
// und schickt sie hierher. Aufruf z.B.:
// POST /api/steps/webhook?secret=DEIN_SECRET  Body: { "steps": 4213 }
export async function POST(req: NextRequest) {
  const secret = process.env.STEPS_WEBHOOK_SECRET;
  const providedSecret =
    req.nextUrl.searchParams.get("secret") || req.headers.get("x-webhook-secret");

  if (!secret) {
    return NextResponse.json(
      { error: "STEPS_WEBHOOK_SECRET ist serverseitig nicht gesetzt" },
      { status: 500 }
    );
  }

  if (providedSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const steps = Number(body.steps);
  const date = typeof body.date === "string" ? body.date : todayISO();

  if (!Number.isFinite(steps) || steps < 0) {
    return NextResponse.json({ error: "steps (Zahl >= 0) erforderlich" }, { status: 400 });
  }

  await d1Query(
    `INSERT INTO entries (habit, date, value) VALUES ('steps', ?, ?)
     ON CONFLICT(habit, date) DO UPDATE SET value = excluded.value`,
    [date, steps]
  );

  return NextResponse.json({ ok: true, date, steps });
}
