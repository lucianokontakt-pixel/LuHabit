import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { HabitType } from "@/lib/habits";
import { currentUserId } from "@/lib/server-user";

type EntryRow = { habit: HabitType; date: string; value: number };

const UNAUTHORIZED = { error: "Nicht angemeldet" };

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const habit = searchParams.get("habit");

  // Der Nutzerfilter steht fest im SQL, nicht in der dynamischen Liste —
  // so ist auch beim Überfliegen sichtbar, dass er nicht wegfallen kann.
  const conditions: string[] = [];
  const params: (string | number)[] = [userId];

  if (habit) {
    conditions.push("habit = ?");
    params.push(habit);
  }
  if (from) {
    conditions.push("date >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("date <= ?");
    params.push(to);
  }

  const filters = conditions.length ? ` AND ${conditions.join(" AND ")}` : "";
  const rows = await d1Query<EntryRow>(
    `SELECT habit, date, value FROM entries WHERE user_id = ? AND deleted_at IS NULL${filters} ORDER BY date ASC`,
    params
  );

  return NextResponse.json({ entries: rows });
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = await req.json();
  const { habit, date, delta, value } = body as {
    habit: HabitType;
    date: string;
    delta?: number;
    value?: number;
  };

  if (!habit || !date) {
    return NextResponse.json({ error: "habit und date sind erforderlich" }, { status: 400 });
  }

  if (delta === undefined && value === undefined) {
    return NextResponse.json({ error: "delta oder value erforderlich" }, { status: 400 });
  }

  // updated_at wird überall mitgeschrieben: darauf steht der Abgleich mit dem
  // Handy ("gib mir alles seit X"). deleted_at bleibt hier unberührt — ein
  // Eintrag wird nicht gelöscht, sondern auf 0 gesetzt.
  //
  // delta ist bewusst nicht wiederholbar (zweimal +250 sind 500). Der Weg für
  // das Handy ist deshalb value: absolute Werte darf die Warteschlange beliebig
  // oft senden. delta bleibt für die Shortcut-Webhooks, die serverseitig genau
  // einmal feuern.
  if (delta !== undefined) {
    await d1Query(
      `INSERT INTO entries (user_id, habit, date, value, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, habit, date) DO UPDATE
         SET value = MAX(0, value + excluded.value), updated_at = datetime('now')`,
      [userId, habit, date, delta]
    );
  } else {
    await d1Query(
      `INSERT INTO entries (user_id, habit, date, value, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, habit, date) DO UPDATE
         SET value = excluded.value, updated_at = datetime('now')`,
      [userId, habit, date, value!]
    );
  }

  const rows = await d1Query<EntryRow>(
    `SELECT habit, date, value FROM entries WHERE user_id = ? AND deleted_at IS NULL AND habit = ? AND date = ?`,
    [userId, habit, date]
  );

  return NextResponse.json({ entry: rows[0] ?? { habit, date, value: 0 } });
}
