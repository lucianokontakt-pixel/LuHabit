import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { resolveNewId } from "@/lib/ids";
import { currentUserId } from "@/lib/server-user";
import {
  MAX_PREPARE_SECONDS,
  MAX_REST_SECONDS,
  MAX_ROUNDS,
  MAX_STEP_REPS,
  MAX_STEP_SECONDS,
  MIN_STEP_SECONDS,
  type EmomStep,
  type EmomTemplate,
} from "@/lib/emom";

type TemplateRow = {
  id: string;
  name: string;
  prepare_seconds: number;
  rounds: number;
  steps: string;
  rest_seconds: number;
  position: number;
};

const UNAUTHORIZED = { error: "Nicht angemeldet" };

const MAX_STEPS = 12;
const COLUMNS = "id, name, prepare_seconds, rounds, steps, rest_seconds, position";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Schritte aus dem Request säubern. Die Spalte hält JSON, also muss beim
 * Schreiben feststehen, dass wirklich nur {seconds,reps,label} drinsteht —
 * sonst kippt später der Timer über einen Wert, den niemand erwartet hat.
 */
function parseSteps(input: unknown): EmomStep[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;

  const steps: EmomStep[] = [];
  for (const raw of input.slice(0, MAX_STEPS)) {
    if (typeof raw !== "object" || raw === null) return null;
    const seconds = Number((raw as { seconds?: unknown }).seconds);
    if (!Number.isFinite(seconds)) return null;
    const label = (raw as { label?: unknown }).label;
    const rawReps = (raw as { reps?: unknown }).reps;
    const reps = Number(rawReps);
    steps.push({
      seconds: Math.round(clamp(seconds, MIN_STEP_SECONDS, MAX_STEP_SECONDS)),
      // Ungültige oder nicht gesetzte Werte heißen: keine Vorgabe — nicht 0
      // Wiederholungen, das wäre eine falsche Behauptung.
      reps: Number.isFinite(reps) && reps > 0 ? Math.round(clamp(reps, 1, MAX_STEP_REPS)) : null,
      label: typeof label === "string" ? label.trim().slice(0, 80) : "",
    });
  }
  return steps.length > 0 ? steps : null;
}

function toTemplate(row: TemplateRow): EmomTemplate {
  let steps: EmomStep[] = [];
  try {
    const parsed = JSON.parse(row.steps);
    steps = parseSteps(parsed) ?? [];
  } catch {
    // Unlesbares JSON darf die Liste nicht sprengen — die Vorlage kommt dann
    // ohne Schritte an und lässt sich im Editor reparieren.
  }

  return {
    id: row.id,
    name: row.name,
    prepareSeconds: row.prepare_seconds,
    rounds: row.rounds,
    steps,
    restSeconds: row.rest_seconds,
    position: row.position,
  };
}

async function listTemplates(userId: string): Promise<EmomTemplate[]> {
  const rows = await d1Query<TemplateRow>(
    `SELECT ${COLUMNS} FROM emom_templates WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY position ASC, created_at ASC`,
    [userId]
  );
  return rows.map(toTemplate);
}

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  return NextResponse.json({ templates: await listTemplates(userId) });
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    prepareSeconds?: number;
    rounds?: number;
    steps?: unknown;
    restSeconds?: number;
  };

  const name = body.name?.trim();
  const steps = parseSteps(body.steps);
  if (!name || !steps) {
    return NextResponse.json(
      { error: "name und mindestens ein Schritt sind erforderlich" },
      { status: 400 }
    );
  }

  const id = resolveNewId("emom", body.id);
  if (!id) return NextResponse.json({ error: "Ungültige id" }, { status: 400 });

  const existing = await d1Query<{ next: number | null }>(
    `SELECT MAX(position) AS next FROM emom_templates WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  const position = (existing[0]?.next ?? -1) + 1;

  await d1Query(
    `INSERT INTO emom_templates (user_id, id, name, prepare_seconds, rounds, steps, rest_seconds, position, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, id) DO UPDATE
       SET name = excluded.name, prepare_seconds = excluded.prepare_seconds,
           rounds = excluded.rounds, steps = excluded.steps,
           rest_seconds = excluded.rest_seconds, position = excluded.position,
           deleted_at = NULL, updated_at = datetime('now')`,
    [
      userId,
      id,
      name.slice(0, 60),
      Math.round(clamp(Number(body.prepareSeconds ?? 10) || 0, 0, MAX_PREPARE_SECONDS)),
      Math.round(clamp(Number(body.rounds ?? 10) || 1, 1, MAX_ROUNDS)),
      JSON.stringify(steps),
      Math.round(clamp(Number(body.restSeconds ?? 0) || 0, 0, MAX_REST_SECONDS)),
      position,
    ]
  );

  return NextResponse.json({ templates: await listTemplates(userId) });
}

export async function PUT(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    prepareSeconds?: number;
    rounds?: number;
    steps?: unknown;
    restSeconds?: number;
  };

  if (!body.id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  const current = await d1Query<TemplateRow>(
    `SELECT ${COLUMNS} FROM emom_templates WHERE user_id = ? AND deleted_at IS NULL AND id = ?`,
    [userId, body.id]
  );
  if (current.length === 0) {
    return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
  }

  const before = current[0];
  const steps = body.steps === undefined ? null : parseSteps(body.steps);
  if (body.steps !== undefined && !steps) {
    return NextResponse.json({ error: "steps braucht mindestens einen Schritt" }, { status: 400 });
  }

  await d1Query(
    `UPDATE emom_templates
        SET name = ?, prepare_seconds = ?, rounds = ?, steps = ?, rest_seconds = ?,
            updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`,
    [
      body.name?.trim().slice(0, 60) || before.name,
      body.prepareSeconds === undefined
        ? before.prepare_seconds
        : Math.round(clamp(Number(body.prepareSeconds) || 0, 0, MAX_PREPARE_SECONDS)),
      body.rounds === undefined
        ? before.rounds
        : Math.round(clamp(Number(body.rounds) || 1, 1, MAX_ROUNDS)),
      steps ? JSON.stringify(steps) : before.steps,
      body.restSeconds === undefined
        ? before.rest_seconds
        : Math.round(clamp(Number(body.restSeconds) || 0, 0, MAX_REST_SECONDS)),
      userId,
      body.id,
    ]
  );

  return NextResponse.json({ templates: await listTemplates(userId) });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  await d1Query(
    `UPDATE emom_templates SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`,
    [userId, id]
  );

  return NextResponse.json({ templates: await listTemplates(userId) });
}
