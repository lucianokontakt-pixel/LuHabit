import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { resolveNewId } from "@/lib/ids";
import { currentUserId } from "@/lib/server-user";
import { MAX_NOTE_LENGTH, MAX_ROUNDS, type EmomResult } from "@/lib/emom";

type ResultRow = {
  id: string;
  template_name: string;
  date: string;
  rounds_planned: number;
  rounds_completed: number;
  note: string | null;
};

const UNAUTHORIZED = { error: "Nicht angemeldet" };
const COLUMNS = "id, template_name, date, rounds_planned, rounds_completed, note";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toResult(row: ResultRow): EmomResult {
  return {
    id: row.id,
    templateName: row.template_name,
    date: row.date,
    roundsPlanned: row.rounds_planned,
    roundsCompleted: row.rounds_completed,
    note: row.note,
  };
}

async function listResults(userId: string): Promise<EmomResult[]> {
  const rows = await d1Query<ResultRow>(
    `SELECT ${COLUMNS} FROM emom_results WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY date DESC, created_at DESC`,
    [userId]
  );
  return rows.map(toResult);
}

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  return NextResponse.json({ results: await listResults(userId) });
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    templateName?: string;
    date?: string;
    roundsPlanned?: number;
    roundsCompleted?: number;
    note?: string | null;
  };

  const templateName = body.templateName?.trim();
  const date = body.date?.trim();
  if (!templateName || !date) {
    return NextResponse.json(
      { error: "templateName und date sind erforderlich" },
      { status: 400 }
    );
  }

  const id = resolveNewId("emomr", body.id);
  if (!id) return NextResponse.json({ error: "Ungültige id" }, { status: 400 });

  const roundsPlanned = Math.round(clamp(Number(body.roundsPlanned ?? 0) || 0, 0, MAX_ROUNDS));
  const roundsCompleted = Math.round(
    clamp(Number(body.roundsCompleted ?? 0) || 0, 0, MAX_ROUNDS)
  );
  const note = body.note?.trim().slice(0, MAX_NOTE_LENGTH) || null;

  await d1Query(
    `INSERT INTO emom_results
       (user_id, id, template_name, date, rounds_planned, rounds_completed, note, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, id) DO UPDATE
       SET template_name = excluded.template_name, date = excluded.date,
           rounds_planned = excluded.rounds_planned, rounds_completed = excluded.rounds_completed,
           note = excluded.note, deleted_at = NULL, updated_at = datetime('now')`,
    [userId, id, templateName.slice(0, 60), date, roundsPlanned, roundsCompleted, note]
  );

  return NextResponse.json({ results: await listResults(userId) });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  await d1Query(
    `UPDATE emom_results SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`,
    [userId, id]
  );

  return NextResponse.json({ results: await listResults(userId) });
}
