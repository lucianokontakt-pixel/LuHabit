import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";

type CustomHabitRow = {
  id: string;
  label: string;
  unit: string;
  icon: string;
  default_goal: number;
  quick_add: string;
  step: number;
  kind: string;
};

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "habit"
  );
}

export async function GET() {
  const rows = await d1Query<CustomHabitRow>(
    `SELECT id, label, unit, icon, default_goal, quick_add, step, kind FROM custom_habits ORDER BY created_at ASC`
  );
  const habits = rows.map((r) => ({
    id: r.id,
    label: r.label,
    unit: r.unit,
    icon: r.icon,
    defaultGoal: r.default_goal,
    quickAdd: JSON.parse(r.quick_add) as number[],
    step: r.step,
    kind: (r.kind || "counter") as "counter" | "toggle",
  }));
  return NextResponse.json({ habits });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { label, unit, icon, defaultGoal, quickAdd, step, kind, weeklyGoal } = body as {
    label: string;
    unit: string;
    icon: string;
    defaultGoal: number;
    quickAdd: number[];
    step: number;
    kind?: string;
    weeklyGoal?: number | null;
  };

  if (!label?.trim() || !unit?.trim() || !defaultGoal || defaultGoal <= 0) {
    return NextResponse.json(
      { error: "label, unit und defaultGoal (> 0) sind erforderlich" },
      { status: 400 }
    );
  }

  const baseId = slugify(label);
  let id = baseId;
  const existing = await d1Query<{ id: string }>(
    `SELECT id FROM custom_habits WHERE id LIKE ?`,
    [`${baseId}%`]
  );
  if (existing.some((e) => e.id === id)) {
    let n = 2;
    while (existing.some((e) => e.id === `${baseId}-${n}`)) n++;
    id = `${baseId}-${n}`;
  }

  const cleanQuickAdd = Array.isArray(quickAdd) && quickAdd.length ? quickAdd : [1];
  const cleanStep = step && step > 0 ? step : cleanQuickAdd[0] ?? 1;
  const cleanKind = kind === "toggle" ? "toggle" : "counter";

  await d1Query(
    `INSERT INTO custom_habits (id, label, unit, icon, default_goal, quick_add, step, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, label.trim(), unit.trim(), icon || "Target", defaultGoal, JSON.stringify(cleanQuickAdd), cleanStep, cleanKind]
  );
  await d1Query(
    `INSERT INTO goals (habit, target, weekly_target) VALUES (?, ?, ?)
     ON CONFLICT(habit) DO UPDATE SET target = excluded.target, weekly_target = excluded.weekly_target`,
    [id, defaultGoal, weeklyGoal ?? null]
  );

  return NextResponse.json({
    habit: {
      id,
      label: label.trim(),
      unit: unit.trim(),
      icon: icon || "Target",
      defaultGoal,
      quickAdd: cleanQuickAdd,
      step: cleanStep,
      kind: cleanKind,
    },
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, label, unit, icon, defaultGoal, quickAdd, step, kind, weeklyGoal } = body as {
    id: string;
    label: string;
    unit: string;
    icon: string;
    defaultGoal: number;
    quickAdd: number[];
    step: number;
    kind?: string;
    weeklyGoal?: number | null;
  };

  if (!id || !label?.trim() || !unit?.trim() || !defaultGoal || defaultGoal <= 0) {
    return NextResponse.json(
      { error: "id, label, unit und defaultGoal (> 0) sind erforderlich" },
      { status: 400 }
    );
  }

  const cleanQuickAdd = Array.isArray(quickAdd) && quickAdd.length ? quickAdd : [1];
  const cleanStep = step && step > 0 ? step : cleanQuickAdd[0] ?? 1;
  const cleanKind = kind === "toggle" ? "toggle" : "counter";

  await d1Query(
    `UPDATE custom_habits SET label = ?, unit = ?, icon = ?, default_goal = ?, quick_add = ?, step = ?, kind = ? WHERE id = ?`,
    [label.trim(), unit.trim(), icon || "Target", defaultGoal, JSON.stringify(cleanQuickAdd), cleanStep, cleanKind, id]
  );
  await d1Query(
    `INSERT INTO goals (habit, target, weekly_target) VALUES (?, ?, ?)
     ON CONFLICT(habit) DO UPDATE SET target = excluded.target, weekly_target = excluded.weekly_target`,
    [id, defaultGoal, weeklyGoal ?? null]
  );

  return NextResponse.json({
    habit: {
      id,
      label: label.trim(),
      unit: unit.trim(),
      icon: icon || "Target",
      defaultGoal,
      quickAdd: cleanQuickAdd,
      step: cleanStep,
      kind: cleanKind,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

  await d1Query(`DELETE FROM custom_habits WHERE id = ?`, [id]);
  await d1Query(`DELETE FROM entries WHERE habit = ?`, [id]);
  await d1Query(`DELETE FROM goals WHERE habit = ?`, [id]);

  return NextResponse.json({ ok: true });
}
