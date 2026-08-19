import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1InsertMany } from "@/lib/d1";
import type { WorkoutSession } from "@/lib/training";

type SessionRow = {
  id: string;
  plan_id: string | null;
  day_id: string | null;
  day_name: string;
  date: string;
  duration_seconds: number | null;
  note: string | null;
};

type SetRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_index: number;
  weight: number;
  reps: number;
  done: number;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(req: NextRequest) {
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "120");
  const limit = Number.isFinite(limitParam) ? Math.min(500, Math.max(1, limitParam)) : 120;
  const from = req.nextUrl.searchParams.get("from");

  const sessions = from
    ? await d1Query<SessionRow>(
        `SELECT id, plan_id, day_id, day_name, date, duration_seconds, note
           FROM workout_sessions WHERE date >= ? ORDER BY date DESC, started_at DESC LIMIT ?`,
        [from, limit]
      )
    : await d1Query<SessionRow>(
        `SELECT id, plan_id, day_id, day_name, date, duration_seconds, note
           FROM workout_sessions ORDER BY date DESC, started_at DESC LIMIT ?`,
        [limit]
      );

  if (sessions.length === 0) return NextResponse.json({ sessions: [] });

  const placeholders = sessions.map(() => "?").join(", ");
  const sets = await d1Query<SetRow>(
    `SELECT id, session_id, exercise_id, set_index, weight, reps, done
       FROM workout_sets WHERE session_id IN (${placeholders}) ORDER BY set_index ASC`,
    sessions.map((s) => s.id)
  );

  const bySession = new Map<string, SetRow[]>();
  for (const set of sets) {
    const list = bySession.get(set.session_id) ?? [];
    list.push(set);
    bySession.set(set.session_id, list);
  }

  const result: WorkoutSession[] = sessions.map((s) => ({
    id: s.id,
    planId: s.plan_id,
    dayId: s.day_id,
    dayName: s.day_name,
    date: s.date,
    durationSeconds: s.duration_seconds,
    note: s.note,
    sets: (bySession.get(s.id) ?? []).map((set) => ({
      id: set.id,
      exerciseId: set.exercise_id,
      setIndex: set.set_index,
      weight: set.weight,
      reps: set.reps,
      done: set.done === 1,
    })),
  }));

  return NextResponse.json({ sessions: result });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    planId?: string | null;
    dayId?: string | null;
    dayName?: string;
    date?: string;
    durationSeconds?: number | null;
    note?: string | null;
    sets?: {
      exerciseId: string;
      setIndex: number;
      weight: number;
      reps: number;
      done?: boolean;
    }[];
  };

  const date = body.date || new Date().toLocaleDateString("sv-SE");
  const dayName = body.dayName?.trim() || "Training";
  const sets = (body.sets ?? []).filter((s) => s.exerciseId && s.reps > 0);

  if (sets.length === 0) {
    return NextResponse.json(
      { error: "Eine Einheit braucht mindestens einen abgeschlossenen Satz" },
      { status: 400 }
    );
  }

  const id = newId("ws");
  await d1Query(
    `INSERT INTO workout_sessions (id, plan_id, day_id, day_name, date, finished_at, duration_seconds, note)
     VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
    [
      id,
      body.planId ?? null,
      body.dayId ?? null,
      dayName,
      date,
      body.durationSeconds ?? null,
      body.note?.trim() || null,
    ]
  );

  await d1InsertMany(
    "workout_sets",
    ["id", "session_id", "exercise_id", "set_index", "weight", "reps", "done"],
    sets.map((s, i) => [
      newId("set"),
      id,
      s.exerciseId,
      s.setIndex ?? i,
      s.weight ?? 0,
      s.reps,
      s.done === false ? 0 : 1,
    ])
  );

  return NextResponse.json({ id, date });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  await d1Query(`DELETE FROM workout_sets WHERE session_id = ?`, [id]);
  await d1Query(`DELETE FROM workout_sessions WHERE id = ?`, [id]);
  return NextResponse.json({ ok: true });
}
