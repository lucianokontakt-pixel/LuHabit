import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { currentUserId } from "@/lib/server-user";
import type { Equipment, Exercise, Muscle } from "@/lib/training";

type ExerciseRow = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  is_custom: number;
  hidden: number;
  increment: number | null;
  bodyweight_factor: number | null;
};

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscle: row.muscle as Muscle,
    equipment: row.equipment as Equipment,
    isCustom: row.is_custom === 1,
    hidden: row.hidden === 1,
    increment: row.increment,
    bodyweightFactor: row.bodyweight_factor,
  };
}

const UNAUTHORIZED = { error: "Nicht angemeldet" };

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "uebung"
  );
}

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const rows = await d1Query<ExerciseRow>(
    `SELECT id, name, muscle, equipment, is_custom, hidden, increment, bodyweight_factor
       FROM exercises WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC`,
    [userId]
  );
  return NextResponse.json({ exercises: rows.map(toExercise) });
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json()) as {
    name?: string;
    muscle?: string;
    equipment?: string;
    increment?: number | null;
    bodyweightFactor?: number | null;
  };

  const name = body.name?.trim();
  if (!name || !body.muscle || !body.equipment) {
    return NextResponse.json(
      { error: "name, muscle und equipment sind erforderlich" },
      { status: 400 }
    );
  }

  const base = slugify(name);
  const existing = await d1Query<{ id: string }>(
    `SELECT id FROM exercises WHERE user_id = ? AND id LIKE ?`,
    [userId, `${base}%`]
  );
  let id = base;
  if (existing.some((e) => e.id === id)) {
    let n = 2;
    while (existing.some((e) => e.id === `${base}-${n}`)) n++;
    id = `${base}-${n}`;
  }

  await d1Query(
    `INSERT INTO exercises (user_id, id, name, muscle, equipment, is_custom, hidden, increment, bodyweight_factor)
     VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`,
    [userId, id, name, body.muscle, body.equipment, body.increment ?? null, body.bodyweightFactor ?? null]
  );

  const rows = await d1Query<ExerciseRow>(
    `SELECT id, name, muscle, equipment, is_custom, hidden, increment, bodyweight_factor
       FROM exercises WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
  return NextResponse.json({ exercise: toExercise(rows[0]) });
}

export async function PUT(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    muscle?: string;
    equipment?: string;
    increment?: number | null;
    bodyweightFactor?: number | null;
    hidden?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });
  }

  const current = await d1Query<ExerciseRow>(
    `SELECT id, name, muscle, equipment, is_custom, hidden, increment, bodyweight_factor
       FROM exercises WHERE user_id = ? AND id = ?`,
    [userId, body.id]
  );
  if (current.length === 0) {
    return NextResponse.json({ error: "Übung nicht gefunden" }, { status: 404 });
  }

  const before = current[0];
  await d1Query(
    `UPDATE exercises
        SET name = ?, muscle = ?, equipment = ?, increment = ?, bodyweight_factor = ?, hidden = ?
      WHERE user_id = ? AND id = ?`,
    [
      body.name?.trim() || before.name,
      body.muscle ?? before.muscle,
      body.equipment ?? before.equipment,
      body.increment === undefined ? before.increment : body.increment,
      body.bodyweightFactor === undefined ? before.bodyweight_factor : body.bodyweightFactor,
      body.hidden === undefined ? before.hidden : body.hidden ? 1 : 0,
      userId,
      body.id,
    ]
  );

  const rows = await d1Query<ExerciseRow>(
    `SELECT id, name, muscle, equipment, is_custom, hidden, increment, bodyweight_factor
       FROM exercises WHERE user_id = ? AND id = ?`,
    [userId, body.id]
  );
  return NextResponse.json({ exercise: toExercise(rows[0]) });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  // Übungen mit Verlauf werden nur ausgeblendet — sonst verlöre man die Statistik.
  const used = await d1Query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM workout_sets WHERE user_id = ? AND exercise_id = ?`,
    [userId, id]
  );
  const inPlans = await d1Query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM plan_exercises WHERE user_id = ? AND exercise_id = ?`,
    [userId, id]
  );

  if ((used[0]?.count ?? 0) > 0 || (inPlans[0]?.count ?? 0) > 0) {
    await d1Query(`UPDATE exercises SET hidden = 1 WHERE user_id = ? AND id = ?`, [userId, id]);
    return NextResponse.json({ ok: true, hidden: true });
  }

  await d1Query(`DELETE FROM exercises WHERE user_id = ? AND id = ?`, [userId, id]);
  return NextResponse.json({ ok: true, hidden: false });
}
