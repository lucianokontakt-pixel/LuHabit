import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { todayISO } from "@/lib/datum";
import { userIdForWebhookSecret } from "@/lib/server-user";

// Für externe Quellen (z.B. iOS Shortcuts) gedacht, die keine Session haben.
// Aufruf z.B.:
// POST /api/entries/webhook?habit=weight&secret=DEIN_SECRET  Body: { "value": 82.4 }
// Das Secret wird beim Nutzer unter /einstellungen generiert und identifiziert
// gleichzeitig, auf wessen Konto der Wert geschrieben wird.
export async function POST(req: NextRequest) {
  const habit = req.nextUrl.searchParams.get("habit");
  const providedSecret =
    req.nextUrl.searchParams.get("secret") || req.headers.get("x-webhook-secret");

  if (!habit) {
    return NextResponse.json({ error: "habit (Query-Param) erforderlich" }, { status: 400 });
  }

  const userId = await userIdForWebhookSecret(providedSecret);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const value = Number(body.value);
  const date = typeof body.date === "string" ? body.date : todayISO();

  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "value (Zahl >= 0) erforderlich" }, { status: 400 });
  }

  await d1Query(
    // updated_at und deleted_at gehören auf die Konfliktseite, nicht nur ins
    // INSERT. Der Abgleich fragt nach COALESCE(updated_at, created_at, ...) —
    // ohne den Stempel synchronisiert der erste Wert eines Tages (der ist neu),
    // jeder korrigierte Wert desselben Tages aber nie. Genau daraus rechnet die
    // App das Startgewicht und jedes Volumen.
    //
    // deleted_at zurückzusetzen ist dieselbe Regel wie in jedem anderen
    // Schreibpfad: wer schreibt, holt den Datensatz zurück. Sonst schriebe die
    // Waage nach einem Zurücksetzen der Körperwerte für immer in eine Zeile,
    // die als gelöscht gilt — mit 200 OK und ohne sichtbare Wirkung.
    `INSERT INTO entries (user_id, habit, date, value, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, habit, date) DO UPDATE
       SET value = excluded.value, updated_at = datetime('now'), deleted_at = NULL`,
    [userId, habit, date, value]
  );

  return NextResponse.json({ ok: true, habit, date, value });
}
