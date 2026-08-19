import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { HabitType } from "@/lib/habits";

type GoalRow = { habit: HabitType; target: number; weekly_target: number | null };

export async function GET() {
  const rows = await d1Query<GoalRow>(`SELECT habit, target, weekly_target FROM goals`);
  const goals = rows.map((r) => ({
    habit: r.habit,
    target: r.target,
    weeklyTarget: r.weekly_target,
  }));
  return NextResponse.json({ goals });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { habit, target, weeklyTarget } = body as {
    habit: HabitType;
    target: number;
    weeklyTarget?: number | null;
  };

  if (!habit || typeof target !== "number") {
    return NextResponse.json({ error: "habit und target erforderlich" }, { status: 400 });
  }

  // weeklyTarget nur anfassen, wenn es explizit im Body steht — sonst bleibt ein
  // bereits gesetztes Wochenziel beim reinen Tagesziel-Update erhalten.
  if ("weeklyTarget" in body) {
    await d1Query(
      `INSERT INTO goals (habit, target, weekly_target) VALUES (?, ?, ?)
       ON CONFLICT(habit) DO UPDATE SET target = excluded.target, weekly_target = excluded.weekly_target`,
      [habit, target, weeklyTarget ?? null]
    );
  } else {
    await d1Query(
      `INSERT INTO goals (habit, target) VALUES (?, ?)
       ON CONFLICT(habit) DO UPDATE SET target = excluded.target`,
      [habit, target]
    );
  }

  return NextResponse.json({ habit, target, weeklyTarget: weeklyTarget ?? null });
}
