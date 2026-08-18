import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { HABITS, HabitType } from "@/lib/habits";

type GoalRow = { habit: HabitType; target: number };

export async function GET() {
  const rows = await d1Query<GoalRow>(`SELECT habit, target FROM goals`);
  return NextResponse.json({ goals: rows });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { habit, target } = body as { habit: HabitType; target: number };

  if (!habit || !HABITS[habit] || typeof target !== "number") {
    return NextResponse.json({ error: "habit und target erforderlich" }, { status: 400 });
  }

  await d1Query(
    `INSERT INTO goals (habit, target) VALUES (?, ?)
     ON CONFLICT(habit) DO UPDATE SET target = excluded.target`,
    [habit, target]
  );

  return NextResponse.json({ habit, target });
}
