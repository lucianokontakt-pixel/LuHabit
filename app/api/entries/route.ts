import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { HABITS, HabitType } from "@/lib/habits";

type EntryRow = { habit: HabitType; date: string; value: number };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const habit = searchParams.get("habit");

  const conditions: string[] = [];
  const params: (string | number)[] = [];

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

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await d1Query<EntryRow>(
    `SELECT habit, date, value FROM entries ${where} ORDER BY date ASC`,
    params
  );

  return NextResponse.json({ entries: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { habit, date, delta, value } = body as {
    habit: HabitType;
    date: string;
    delta?: number;
    value?: number;
  };

  if (!habit || !HABITS[habit] || !date) {
    return NextResponse.json({ error: "habit und date sind erforderlich" }, { status: 400 });
  }

  if (delta === undefined && value === undefined) {
    return NextResponse.json({ error: "delta oder value erforderlich" }, { status: 400 });
  }

  if (delta !== undefined) {
    await d1Query(
      `INSERT INTO entries (habit, date, value) VALUES (?, ?, ?)
       ON CONFLICT(habit, date) DO UPDATE SET value = MAX(0, value + excluded.value)`,
      [habit, date, delta]
    );
  } else {
    await d1Query(
      `INSERT INTO entries (habit, date, value) VALUES (?, ?, ?)
       ON CONFLICT(habit, date) DO UPDATE SET value = excluded.value`,
      [habit, date, value!]
    );
  }

  const rows = await d1Query<EntryRow>(
    `SELECT habit, date, value FROM entries WHERE habit = ? AND date = ?`,
    [habit, date]
  );

  return NextResponse.json({ entry: rows[0] ?? { habit, date, value: 0 } });
}
