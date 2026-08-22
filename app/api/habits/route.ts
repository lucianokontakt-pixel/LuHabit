import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { validSlugId } from "@/lib/ids";
import { slugifyHabit } from "@/lib/slugify";
import { currentUserId } from "@/lib/server-user";

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

const UNAUTHORIZED = { error: "Nicht angemeldet" };

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const rows = await d1Query<CustomHabitRow>(
    `SELECT id, label, unit, icon, default_goal, quick_add, step, kind
       FROM custom_habits WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
    [userId]
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
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = await req.json();
  const { label, unit, icon, defaultGoal, quickAdd, step, kind, weeklyGoal } = body as {
    id?: string;
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

  // Bringt der Client eine ID mit, gilt sie. Vergäbe der Server sie hier selbst,
  // würde ein Wiederholungsversuch nach unklarem Abbruch den vorhandenen
  // Bezeichner sehen und "lesen-2" anlegen — aus einem abgebrochenen Anlegen
  // würden zwei Habits. Mit fester ID trifft die Wiederholung dieselbe Zeile.
  let id: string;
  if (body.id !== undefined && body.id !== null) {
    const given = validSlugId(body.id);
    if (!given) return NextResponse.json({ error: "Ungültige id" }, { status: 400 });
    id = given;
  } else {
    const baseId = slugifyHabit(label);
    id = baseId;
    const existing = await d1Query<{ id: string }>(
      `SELECT id FROM custom_habits WHERE user_id = ? AND deleted_at IS NULL AND id LIKE ?`,
      [userId, `${baseId}%`]
    );
    if (existing.some((e) => e.id === id)) {
      let n = 2;
      while (existing.some((e) => e.id === `${baseId}-${n}`)) n++;
      id = `${baseId}-${n}`;
    }
  }

  const cleanQuickAdd = Array.isArray(quickAdd) && quickAdd.length ? quickAdd : [1];
  const cleanStep = step && step > 0 ? step : cleanQuickAdd[0] ?? 1;
  const cleanKind = kind === "toggle" ? "toggle" : "counter";

  await d1Query(
    `INSERT INTO custom_habits
       (user_id, id, label, unit, icon, default_goal, quick_add, step, kind, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, id) DO UPDATE
       SET label = excluded.label, unit = excluded.unit, icon = excluded.icon,
           default_goal = excluded.default_goal, quick_add = excluded.quick_add,
           step = excluded.step, kind = excluded.kind,
           deleted_at = NULL, updated_at = datetime('now')`,
    [userId, id, label.trim(), unit.trim(), icon || "Target", defaultGoal, JSON.stringify(cleanQuickAdd), cleanStep, cleanKind]
  );
  await d1Query(
    `INSERT INTO goals (user_id, habit, target, weekly_target, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, habit)
     DO UPDATE SET target = excluded.target,
                   weekly_target = excluded.weekly_target,
                   deleted_at = NULL,
                   updated_at = datetime('now')`,
    [userId, id, defaultGoal, weeklyGoal ?? null]
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
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

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
    `UPDATE custom_habits
        SET label = ?, unit = ?, icon = ?, default_goal = ?, quick_add = ?, step = ?, kind = ?,
            updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`,
    [label.trim(), unit.trim(), icon || "Target", defaultGoal, JSON.stringify(cleanQuickAdd), cleanStep, cleanKind, userId, id]
  );
  await d1Query(
    `INSERT INTO goals (user_id, habit, target, weekly_target, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, habit)
     DO UPDATE SET target = excluded.target,
                   weekly_target = excluded.weekly_target,
                   updated_at = datetime('now')`,
    [userId, id, defaultGoal, weeklyGoal ?? null]
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
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

  // Grabstein statt echtem Löschen: eine Zeile, die einfach verschwindet, ist
  // vom Handy aus nicht von einer zu unterscheiden, die es nie gab — sie käme
  // beim nächsten Abgleich zurück. Wer die Zeile liest, filtert deleted_at.
  await d1Query(
    `UPDATE custom_habits SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
  await d1Query(
    `UPDATE entries SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND habit = ?`,
    [userId, id]
  );
  await d1Query(
    `UPDATE goals SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND habit = ?`,
    [userId, id]
  );

  return NextResponse.json({ ok: true });
}
