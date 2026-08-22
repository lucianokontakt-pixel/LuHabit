import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1InsertMany } from "@/lib/d1";
import { newId, resolveNewId } from "@/lib/ids";
import { currentUserId } from "@/lib/server-user";
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
  warmup: number;
};

const UNAUTHORIZED = { error: "Nicht angemeldet" };

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "120");
  const limit = Number.isFinite(limitParam) ? Math.min(500, Math.max(1, limitParam)) : 120;
  const from = req.nextUrl.searchParams.get("from");

  const sessions = from
    ? await d1Query<SessionRow>(
        `SELECT id, plan_id, day_id, day_name, date, duration_seconds, note
           FROM workout_sessions WHERE user_id = ? AND deleted_at IS NULL AND date >= ?
          ORDER BY date DESC, started_at DESC LIMIT ?`,
        [userId, from, limit]
      )
    : await d1Query<SessionRow>(
        `SELECT id, plan_id, day_id, day_name, date, duration_seconds, note
           FROM workout_sessions WHERE user_id = ? AND deleted_at IS NULL
          ORDER BY date DESC, started_at DESC LIMIT ?`,
        [userId, limit]
      );

  if (sessions.length === 0) return NextResponse.json({ sessions: [] });

  const placeholders = sessions.map(() => "?").join(", ");
  const sets = await d1Query<SetRow>(
    `SELECT id, session_id, exercise_id, set_index, weight, reps, done, warmup
       FROM workout_sets WHERE user_id = ? AND session_id IN (${placeholders})
      ORDER BY set_index ASC`,
    [userId, ...sessions.map((s) => s.id)]
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
      warmup: set.warmup === 1,
    })),
  }));

  return NextResponse.json({ sessions: result });
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json()) as {
    id?: string;
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
      warmup?: boolean;
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

  // Die ID kommt vom Handy, wenn sie mitkommt: eine offline abgeschlossene
  // Einheit braucht ihre endgültige ID sofort, sonst kann die App sie bis zum
  // Abgleich nirgends referenzieren.
  const id = resolveNewId("ws", body.id);
  if (!id) return NextResponse.json({ error: "Ungültige id" }, { status: 400 });

  await d1Query(
    `INSERT INTO workout_sessions
       (user_id, id, plan_id, day_id, day_name, date, finished_at, duration_seconds, note, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, datetime('now'))
     -- Schlüssel ist die ID allein, deshalb der Besitzer-Vergleich: sonst
     -- könnte ein fremdes Konto mit geratener ID diese Einheit überschreiben,
     -- sobald die IDs vom Client kommen. Siehe gleiche Stelle in plans/route.ts.
     ON CONFLICT(id) DO UPDATE
       SET plan_id = excluded.plan_id, day_id = excluded.day_id,
           day_name = excluded.day_name, date = excluded.date,
           duration_seconds = excluded.duration_seconds, note = excluded.note,
           deleted_at = NULL, updated_at = datetime('now')
     WHERE workout_sessions.user_id = excluded.user_id`,
    [
      userId,
      id,
      body.planId ?? null,
      body.dayId ?? null,
      dayName,
      date,
      body.durationSeconds ?? null,
      body.note?.trim() || null,
    ]
  );

  // Vor dem Schreiben aufräumen. Ohne das wäre ein zweites Senden derselben
  // Einheit — was die Warteschlange ausdrücklich darf — kein Überschreiben,
  // sondern eine Einheit mit doppelten Sätzen.
  await d1Query(`DELETE FROM workout_sets WHERE user_id = ? AND session_id = ?`, [userId, id]);

  await d1InsertMany(
    "workout_sets",
    ["user_id", "id", "session_id", "exercise_id", "set_index", "weight", "reps", "done", "warmup"],
    sets.map((s, i) => [
      userId,
      newId("set"),
      id,
      s.exerciseId,
      s.setIndex ?? i,
      s.weight ?? 0,
      s.reps,
      s.done === false ? 0 : 1,
      s.warmup ? 1 : 0,
    ])
  );

  return NextResponse.json({ id, date });
}

/**
 * Eine gespeicherte Einheit überschreiben. Die Sätze werden komplett neu
 * geschrieben statt einzeln abgeglichen — der Client schickt ohnehin den
 * vollständigen Stand, und ein Teilabgleich könnte Lücken hinterlassen.
 */
export async function PUT(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json()) as {
    id?: string;
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
      warmup?: boolean;
    }[];
  };

  if (!body.id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  const current = await d1Query<SessionRow>(
    `SELECT id, plan_id, day_id, day_name, date, duration_seconds, note
       FROM workout_sessions WHERE user_id = ? AND deleted_at IS NULL AND id = ?`,
    [userId, body.id]
  );
  if (current.length === 0) {
    return NextResponse.json({ error: "Einheit nicht gefunden" }, { status: 404 });
  }

  const sets = (body.sets ?? []).filter((s) => s.exerciseId && s.reps > 0);
  if (body.sets && sets.length === 0) {
    return NextResponse.json(
      { error: "Eine Einheit braucht mindestens einen Satz — sonst lösch sie ganz" },
      { status: 400 }
    );
  }

  await d1Query(
    `UPDATE workout_sessions
        SET day_name = ?, date = ?, duration_seconds = ?, note = ?,
            updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`,
    [
      body.dayName?.trim() || current[0].day_name,
      body.date || current[0].date,
      body.durationSeconds === undefined ? current[0].duration_seconds : body.durationSeconds,
      body.note === undefined ? current[0].note : body.note?.trim() || null,
      userId,
      body.id,
    ]
  );

  if (body.sets) {
    await d1Query(`DELETE FROM workout_sets WHERE user_id = ? AND session_id = ?`, [
      userId,
      body.id,
    ]);
    await d1InsertMany(
      "workout_sets",
      ["user_id", "id", "session_id", "exercise_id", "set_index", "weight", "reps", "done", "warmup"],
      sets.map((s, i) => [
        userId,
        newId("set"),
        body.id!,
        s.exerciseId,
        s.setIndex ?? i,
        s.weight ?? 0,
        s.reps,
        s.done === false ? 0 : 1,
        s.warmup ? 1 : 0,
      ])
    );
  }

  return NextResponse.json({ ok: true, id: body.id, date: body.date || current[0].date });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  await d1Query(`DELETE FROM workout_sets WHERE user_id = ? AND session_id = ?`, [userId, id]);
  await d1Query(`UPDATE workout_sessions SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`, [userId, id]);
  return NextResponse.json({ ok: true });
}
